const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();

// Reverted to a simpler V1 function syntax to resolve deployment errors.
exports.requestStudentLink = functions.region("asia-southeast1").https.onRequest((req, res) => {
  // Use the CORS middleware
  cors(req, res, async () => {
    // 1. Manually check for auth token.
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.');
      res.status(403).send('Unauthorized');
      return;
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const phone = decodedToken.phone_number;

      if (!phone) {
        res.status(400).send({error: "The authenticated user does not have a phone number."});
        return;
      }
      
      const localPhoneNumber = phone.replace("+855", "0");
      console.log(`Link request for UID: ${uid}, Phone: ${phone}, LocalPhone: ${localPhoneNumber}`);
      
      const db = admin.firestore();
      const studentQuery = db.collection("students")
        .where("phone", "==", localPhoneNumber)
        .where("authUid", "in", [null, ""])
        .limit(1);

      const querySnapshot = await studentQuery.get();

      if (querySnapshot.empty) {
        console.warn(`No unlinked student record found for phone number: ${localPhoneNumber}.`);
        res.status(404).send({error: "No student record found for your phone number."});
        return;
      }

      const studentDoc = querySnapshot.docs[0];
      await studentDoc.ref.update({ authUid: uid });
      console.log(`Successfully linked student ${studentDoc.id} to auth user ${uid}.`);
      res.status(200).send({success: true, message: "Account linked successfully."});

    } catch (error) {
      console.error('Error while verifying Firebase ID token or linking student:', error);
      res.status(403).send('Unauthorized');
    }
  });
});

exports.generateAttendancePasscode = functions.region("asia-southeast1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const passcode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expires = admin.firestore.Timestamp.fromMillis(Date.now() + 60000); // Valid for 60 seconds

  const passcodeRef = db.collection("attendancePasscodes").doc(passcode);
  await passcodeRef.set({
    studentAuthUid: uid,
    expires: expires,
    used: false,
  });

  functions.logger.log(`Generated passcode ${passcode} for UID: ${uid}`);
  return { passcode: passcode };
});

exports.redeemAttendancePasscode = functions.region("asia-southeast1").https.onCall(async (data, context) => {
  const logger = functions.logger;
  const db = admin.firestore();

  // 1. Verify admin is making the call
  if (!context.auth || !context.auth.token.email) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }
  const adminEmail = context.auth.token.email;
  const passcode = data.passcode;
  if (!passcode) {
    throw new functions.https.HttpsError("invalid-argument", "A 'passcode' must be provided.");
  }

  const passcodeRef = db.collection("attendancePasscodes").doc(passcode);
  const passcodeDoc = await passcodeRef.get();

  // 2. Validate the passcode
  if (!passcodeDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Invalid QR Code.");
  }
  const passcodeData = passcodeDoc.data();
  if (passcodeData.used) {
    throw new functions.https.HttpsError("already-exists", "This QR Code has already been used.");
  }
  if (new Date() > passcodeData.expires.toDate()) {
    throw new functions.https.HttpsError("deadline-exceeded", "This QR Code has expired.");
  }

  // 3. Mark passcode as used immediately to prevent race conditions
  await passcodeRef.update({ used: true });

  // 4. Run database lookups for student and existing attendance
  const studentUid = passcodeData.studentAuthUid;
  const dateStr = new Date().toISOString().split('T')[0];
  
  const [studentQuery, attendanceQuery] = await Promise.all([
    db.collection("students").where("authUid", "==", studentUid).limit(1).get(),
    db.collection("attendance").where("authUid", "==", studentUid).where("date", "==", dateStr).get()
  ]);

  // 5. Validate lookups
  if (studentQuery.empty) {
    throw new functions.https.HttpsError("not-found", "No student record is associated with this QR Code.");
  }
  const studentDoc = studentQuery.docs[0];
  const studentData = studentDoc.data();
  if (!attendanceQuery.empty) {
    const existingStatus = attendanceQuery.docs[0].data().status;
    throw new functions.https.HttpsError("already-exists", `${studentData.fullName} was already marked '${existingStatus}' today.`);
  }

  // 6. Calculate late status
  const classesSnap = await db.collection("classes").get();
  const classConfigs = classesSnap.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});
  let attendanceStatus = "present";
  const classConfig = studentData.class ? classConfigs[studentData.class] : null;
  const shiftConfig = (studentData.shift && classConfig?.shifts) ? classConfig.shifts[studentData.shift] : null;

  if (shiftConfig && shiftConfig.startTime) {
    const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
    const shiftStartTimeDate = new Date();
    shiftStartTimeDate.setHours(startHour, startMinute, 0, 0);
    // Use gracePeriodMinutes from studentData if set, else default to 15
    let graceMinutes = 15;
    if (
      typeof studentData.gracePeriodMinutes === 'number' && !isNaN(studentData.gracePeriodMinutes)
    ) {
      graceMinutes = studentData.gracePeriodMinutes;
    } else if (
      typeof studentData.gracePeriodMinutes === 'string' && studentData.gracePeriodMinutes.trim() !== '' && !isNaN(Number(studentData.gracePeriodMinutes))
    ) {
      graceMinutes = Number(studentData.gracePeriodMinutes);
    }
    const onTimeDeadline = new Date(shiftStartTimeDate);
    onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);
    if (new Date() > onTimeDeadline) {
      attendanceStatus = "late";
    }
  }

  // 7. Create the attendance record
  await db.collection("attendance").add({
    studentId: studentDoc.id,
    authUid: studentUid,
    studentName: studentData.fullName,
    class: studentData.class || null,
    shift: studentData.shift || null,
    status: attendance.status,
    date: dateStr,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    scannedBy: adminEmail,
  });

  functions.logger.log(`Attendance recorded for ${studentData.fullName} (${attendanceStatus}) by ${adminEmail}`);
  const message = `${studentData.fullName} marked ${attendanceStatus}!`;
  return { success: true, message: message };
});