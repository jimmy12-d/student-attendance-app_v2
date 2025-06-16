const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// This function links a new Firebase Auth user to a student record. No changes needed here.
exports.linkStudentOnCreate = functions.region("asia-southeast1").auth.user().onCreate(async (user) => {
  const logger = functions.logger;

  if (!user.phoneNumber) {
    logger.log(`User ${user.uid} created without a phone number. Exiting function.`);
    return null;
  }
  const localPhoneNumber = user.phoneNumber.replace("+855", "0");
  logger.log(`New user created: UID=${user.uid}, Phone=${user.phoneNumber}, LocalPhone=${localPhoneNumber}`);

  const db = admin.firestore();
  const studentsRef = db.collection("students");

  const studentQuery = studentsRef
    .where("phone", "==", localPhoneNumber)
    .where("authUid", "in", [null, ""])
    .limit(1);

  try {
    const querySnapshot = await studentQuery.get();
    if (querySnapshot.empty) {
      logger.warn(`No unlinked student record found for phone number: ${localPhoneNumber}. UID: ${user.uid}`);
      return null;
    }
    const studentDoc = querySnapshot.docs[0];
    logger.log(`Found matching student document: ${studentDoc.id}`);
    await studentDoc.ref.update({ authUid: user.uid, });
    logger.log(`Successfully linked student ${studentDoc.id} to auth user ${user.uid}.`);
    return { result: `Student ${studentDoc.id} linked to user ${user.uid}.` };
  } catch (error) {
    logger.error("Error linking student to auth user:", error);
    return null;
  }
});


// CORRECTED: This is a "Callable" function again.
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


// CORRECTED: This is the optimized "Callable" function.
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
    const graceMinutes = 15;
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
    status: attendanceStatus,
    date: dateStr,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    scannedBy: adminEmail,
  });

  logger.log(`Attendance recorded for ${studentData.fullName} (${attendanceStatus}) by ${adminEmail}`);
  const message = `${studentData.fullName} marked ${attendanceStatus}!`;
  return { success: true, message: message };
});