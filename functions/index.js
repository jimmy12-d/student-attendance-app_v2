const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();

// You will need to install a third-party SMS service provider's package
// e.g., `npm install twilio` in the `functions` directory
// const twilio = require("twilio");
// const twilioClient = new twilio(functions.config().twilio.sid, functions.config().twilio.token);

const db = admin.firestore();

// --- Helper function for phone number normalization ---
const normalizePhone = (phoneNumber) => {
    let normalizedPhone;
    if (phoneNumber.startsWith('+855')) {
        normalizedPhone = '0' + phoneNumber.substring(4);
    } else if (phoneNumber.startsWith('0')) {
        normalizedPhone = phoneNumber;
    } else if (phoneNumber.length >= 8 && phoneNumber.length <= 9 && !phoneNumber.startsWith('0')) {
        normalizedPhone = '0' + phoneNumber;
    } else {
        normalizedPhone = phoneNumber;
    }
    return normalizedPhone;
}

exports.sendLinkOtp = functions.region("asia-southeast1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    
    const uid = context.auth.uid;
    const phoneNumber = data.phoneNumber;

    if (!phoneNumber) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'phoneNumber' argument.");
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    // 1. Check if a student with this phone number exists and is unlinked
    const studentQuery = db.collection("students").where("phone", "==", normalizedPhone).limit(1);
    const studentSnapshot = await studentQuery.get();
    
    if (studentSnapshot.empty) {
        throw new functions.https.HttpsError("not-found", "No student record found for this phone number.");
    }
    
    const studentData = studentSnapshot.docs[0].data();
    if (studentData.authUid) {
        throw new functions.https.HttpsError("already-exists", "This phone number is already linked to an account.");
    }

    // 2. Generate and save a temporary OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    const otpRef = db.collection("otpLinks").doc(uid);
    await otpRef.set({
        phoneNumber: normalizedPhone,
        otp: otp,
        expires: expires,
    });

    // 3. Send the OTP via a third-party SMS service
    // !! IMPORTANT !! You must integrate your own SMS provider here.
    try {
        // const message = await twilioClient.messages.create({
        //     body: `Your verification code is ${otp}`,
        //     to: `+855${normalizedPhone.substring(1)}`, // E.164 format for Twilio
        //     from: functions.config().twilio.from_number,
        // });
        // functions.logger.log("OTP Sent:", message.sid);
        functions.logger.log(`[PRETEND SMS] Sending OTP ${otp} to ${normalizedPhone}`);
    } catch (error) {
        functions.logger.error("Failed to send OTP SMS:", error);
        throw new functions.https.HttpsError("internal", "Could not send verification code.");
    }
    
    return { success: true };
});

exports.linkAccount = functions.region("asia-southeast1").https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const uid = context.auth.uid;
    const email = context.auth.token.email;
    const phoneNumber = data.phoneNumber;
    const otp = data.otp;

    if (!phoneNumber || !otp) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with 'phoneNumber' and 'otp' arguments.");
    }

    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "The user's email is not available.");
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    // 1. Verify the OTP
    const otpRef = db.collection("otpLinks").doc(uid);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
        throw new functions.https.HttpsError("not-found", "No OTP was requested. Please request a code first.");
    }

    const otpData = otpDoc.data();
    const isExpired = new Date() > otpData.expires.toDate();

    if (otpData.phoneNumber !== normalizedPhone || otpData.otp !== otp || isExpired) {
        if (isExpired) {
            throw new functions.https.HttpsError("deadline-exceeded", "The verification code has expired. Please request a new one.");
        }
        throw new functions.https.HttpsError("permission-denied", "The verification code is incorrect.");
    }
    
    // 2. Find the matching student (we already know they exist from the sendOtp step, but re-query for safety)
    const studentQuery = db.collection("students")
        .where("phone", "==", normalizedPhone)
        .where("authUid", "in", [null, "", undefined])
        .limit(1);

    const querySnapshot = await studentQuery.get();

    if (querySnapshot.empty) {
        // This should theoretically never happen if the OTP was verified correctly
        throw new functions.https.HttpsError("not-found", `No unlinked student record found for phone number: ${normalizedPhone}.`);
    }

    const studentDoc = querySnapshot.docs[0];

    // 3. Link the account and delete the OTP
    await studentDoc.ref.update({ authUid: uid, email: email });
    await otpRef.delete(); // Clean up the used OTP
    
    console.log(`Successfully linked student ${studentDoc.id} (phone: ${normalizedPhone}) to auth user ${uid}.`);

    return { success: true };
});

// This function is no longer needed with the new Google Sign-In flow.
/*
exports.requestStudentLink = functions.region("asia-southeast1").https.onRequest((req, res) => {
// ... function content
});
*/

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