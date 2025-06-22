const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK
admin.initializeApp();

// --- Helper function for phone number normalization ---
const normalizePhone = (phoneNumber) => {
    if (!phoneNumber) return "";
    if (phoneNumber.startsWith('+855')) {
        return '0' + phoneNumber.substring(4);
    }
    if (phoneNumber.length >= 8 && phoneNumber.length <= 9 && !phoneNumber.startsWith('0')) {
        return '0' + phoneNumber;
    }
    return phoneNumber;
};


// =================================================================
// NEW SECURE FUNCTIONS FOR ACCOUNT LINKING
// =================================================================

// NEW FUNCTION #1: Sends an OTP to a phone number to begin the linking process.
exports.sendAccountLinkOtp = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Please sign in first.");
    }

    const phoneNumber = data.phoneNumber;
    if (!phoneNumber) {
      throw new functions.https.HttpsError("invalid-argument", "Phone number is required.");
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    
    // 1. Check if a student with this phone number exists AND is NOT already linked
    const studentsRef = admin.firestore().collection("students");
    const studentQuery = await studentsRef.where("phone", "==", normalizedPhone).limit(1).get();

    if (studentQuery.empty) {
      throw new functions.https.HttpsError("not-found", "This phone number is not registered with any student. Please contact a Rodwell Admin for assistance.");
    }
    const studentDoc = studentQuery.docs[0];
    if (studentDoc.data().authUid) {
        throw new functions.https.HttpsError("already-exists", "This student profile is already linked to a login account.");
    }

    // 2. Generate a random 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = admin.firestore.Timestamp.fromMillis(Date.now() + (10 * 60 * 1000)); // 10 minute expiry

    // 3. Store the OTP in a temporary document for verification later
    const linkAttemptRef = admin.firestore().collection("link_attempts").doc(context.auth.uid);
    await linkAttemptRef.set({
        authUid: context.auth.uid,
        phoneNumber: normalizedPhone,
        otp: otp,
        expires: expires,
    });
    
    // 4. Send the SMS using the Twilio Extension
    const e164Phone = `+855${normalizedPhone.substring(1)}`;
    await admin.firestore().collection("messages").add({
        to: e164Phone,
        body: `Your Rodwell College verification code is: ${otp}`
    });

    console.log(`Sent link OTP to ${e164Phone} for user ${context.auth.uid}`);
    // For development, we return the OTP to the client to make testing easier.
    // In production, you should remove the 'otp' field from the return object.
    return { success: true, otp: otp, expires: expires.toMillis() };
  });


// NEW FUNCTION #2: Verifies the OTP and securely connects the student record.
// Note: I have renamed your 'linkAccount' to 'verifyAndConnectAccount' to match the frontend code.
exports.verifyAndConnectAccount = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Please sign in first.");
    }
    
    const { phoneNumber, otp } = data;
    const { uid, token } = context.auth;

    if (!phoneNumber || !otp) {
      throw new functions.https.HttpsError("invalid-argument", "Phone number and OTP are required.");
    }

    const linkAttemptRef = admin.firestore().collection("link_attempts").doc(uid);
    const linkAttemptSnap = await linkAttemptRef.get();

    if (!linkAttemptSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Verification failed. Please request a new code.");
    }

    const attempt = linkAttemptSnap.data();

    // 1. Verify the data is correct and not expired
    if (attempt.otp !== otp) {
        throw new functions.https.HttpsError("invalid-argument", "The code you entered is incorrect.");
    }
    if (Date.now() > attempt.expires.toMillis()) {
        await linkAttemptRef.delete(); // Clean up expired attempt
        throw new functions.https.HttpsError("deadline-exceeded", "The verification code has expired. Please request a new code.");
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    
    // 2. Data is valid, so find the student and link them
    const studentsRef = admin.firestore().collection("students");
    const studentQuery = await studentsRef.where("phone", "==", normalizedPhone).limit(1).get();

    if (studentQuery.empty) {
        throw new functions.https.HttpsError("not-found", "Student profile not found. Contact administration.");
    }

    const studentDoc = studentQuery.docs[0];
    await studentDoc.ref.update({ 
      authUid: uid,
      email: token.email || null 
    }); 

    // 3. Clean up by deleting the temporary attempt document
    await linkAttemptRef.delete();

    console.log(`Successfully linked authUid ${uid} to student ${studentDoc.id}`);
    return { success: true };
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