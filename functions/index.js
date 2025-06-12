const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.linkStudentOnCreate = functions.auth.user().onCreate(async (user) => {
  const logger = functions.logger;

  if (!user.phoneNumber) {
    logger.log(`User ${user.uid} created without a phone number. Exiting function.`);
    return null;
  }

  const localPhoneNumber = user.phoneNumber.replace("+855", "0");
  logger.log(`New user created: UID=<span class="math-inline">\{user\.uid\}, Phone\=</span>{user.phoneNumber}, LocalPhone=${localPhoneNumber}`);

  const db = admin.firestore();
  const studentsRef = db.collection("students");

  // This query now robustly checks for a student with a matching phone 
  // where authUid is either not set (null) or is an empty string.
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

    await studentDoc.ref.update({
      authUid: user.uid,
    });

    logger.log(`Successfully linked student ${studentDoc.id} to auth user ${user.uid}.`);
    return { result: `Student ${studentDoc.id} linked to user ${user.uid}.` };
  } catch (error) {
    logger.error("Error linking student to auth user:", error);
    // You can check the logs for this error if problems continue.
    return null;
  }
});

//
const jwt = require("jsonwebtoken");

// This function generates a short-lived, secure token for a student.
exports.generateAttendanceToken = functions.https.onCall(async (data, context) => {
  // Ensure the user calling this function is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = context.auth.uid;
  const secret = functions.config().jwt.secret;

  // Create a token that contains the user's UID and expires in 60 seconds.
  const attendanceToken = jwt.sign({ uid: uid }, secret, { expiresIn: "60s" });

  functions.logger.log(`Generated token for UID: ${uid}`);
  return { token: attendanceToken };
});

// This function verifies a token from the scanner and records attendance.
exports.verifyAndRecordAttendance = functions.https.onCall(async (data, context) => {
  const logger = functions.logger;

  // 1. Verify the user scanning is an authorized admin
  if (!context.auth || !context.auth.token.email) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }
  const adminEmail = context.auth.token.email;
  const isAuthorized = (await admin.firestore().collection("authorizedUsers").doc(adminEmail).get()).exists;
  if (!isAuthorized) {
    throw new functions.https.HttpsError("permission-denied", "You must be an admin to perform this action.");
  }

  // 2. Verify the token from the QR code
  const token = data.token;
  if (!token) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'token' argument.");
  }
  const secret = functions.config().jwt.secret;
  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (error) {
    logger.error("Token verification failed:", error.message);
    throw new functions.https.HttpsError("invalid-argument", `Invalid Token: ${error.message}`);
  }

  const studentUid = decoded.uid;

  // 3. Get the student's data from Firestore
  const db = admin.firestore();
  const studentQuery = await db.collection("students").where("authUid", "==", studentUid).limit(1).get();
  if (studentQuery.empty) {
    throw new functions.https.HttpsError("not-found", `No student found for UID: ${studentUid}`);
  }
  const studentDoc = studentQuery.docs[0];
  const studentData = studentDoc.data();

  // 4. Check if attendance has already been recorded for today
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // "YYYY-MM-DD"
  const attendanceQuery = await db.collection("attendance")
    .where("authUid", "==", studentUid)
    .where("date", "==", dateStr)
    .get();

  if (!attendanceQuery.empty) {
    const existingStatus = attendanceQuery.docs[0].data().status || "present";
    logger.info(`Duplicate scan for ${studentData.fullName}`);
    throw new functions.https.HttpsError("already-exists", `${studentData.fullName} was already marked ${existingStatus} today.`);
  }

  // 5. Calculate if the student is late (logic moved from frontend)
  let attendanceStatus = "present"; // Default to on-time
  const classConfigs = (await db.collection("classes").get()).docs.reduce((acc, doc) => {
    acc[doc.id] = doc.data();
    return acc;
  }, {});

  const classConfig = studentData.class ? classConfigs[studentData.class] : null;
  const shiftConfig = (studentData.shift && classConfig?.shifts) ? classConfig.shifts[studentData.shift] : null;

  if (shiftConfig && shiftConfig.startTime) {
    const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
    const shiftStartTimeDate = new Date();
    shiftStartTimeDate.setHours(startHour, startMinute, 0, 0);

    const onTimeDeadline = new Date(shiftStartTimeDate);
    // Using global grace period for now, can be customized later
    const graceMinutes = 5; // Example grace period
    onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);

    if (today > onTimeDeadline) {
      attendanceStatus = "late";
    }
  }

  // 6. Record the attendance
  await db.collection("attendance").add({
    studentId: studentDoc.id,
    authUid: studentUid,
    studentName: studentData.fullName,
    class: studentData.class || null,
    shift: studentData.shift || null,
    status: attendanceStatus,
    date: dateStr,
    scannedAt: admin.firestore.FieldValue.serverTimestamp(),
    scannedBy: adminEmail,
  });

  logger.log(`Attendance recorded for <span class="math-inline">\{studentData\.fullName\} \(</span>{attendanceStatus}) by ${adminEmail}`);
  const message = `${studentData.fullName} marked ${attendanceStatus}!`;
  return { success: true, message: message };
});