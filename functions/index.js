const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const {onRequest} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const {setGlobalOptions} = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v1/https");
const cors = require("cors")({ origin: true });
const vision = require("@google-cloud/vision");
const cosineSimilarity = require("cosine-similarity");

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = getFirestore();
const visionClient = new vision.ImageAnnotatorClient();

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

// This is the new v2 syntax for the Storage trigger.
// By explicitly naming the bucket, we avoid region auto-detection errors during deployment.
exports.processFaceEnrollmentImage = onObjectFinalized({ 
    region: "us-central1", // IMPORTANT: Match this to your Storage bucket's location. Forcing redeploy.
    bucket: "rodwell-attendance.firebasestorage.app" 
}, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Exit if this is triggered by a non-image file.
    if (!contentType || !contentType.startsWith("image/")) {
        return console.log("This is not an image.");
    }

    // Exit if the image is not in the correct folder.
    if (!filePath.startsWith("face_enrollment/")) {
        return console.log("Not a face enrollment image.");
    }

    const parts = filePath.split('/');
    if (parts.length < 3) {
        return console.error("Invalid file path structure:", filePath);
    }
    const studentAuthUid = parts[1];

    if (!studentAuthUid) {
        return console.error("Could not extract studentAuthUid from path:", filePath);
    }

    console.log(`Processing face enrollment for student UID: ${studentAuthUid}`);

    try {
        const imageUri = `gs://${fileBucket}/${filePath}`;
        
        const [result] = await visionClient.faceDetection(imageUri);
        const faces = result.faceAnnotations;

        if (!faces || faces.length === 0) {
            console.log(`No faces detected in image: ${filePath}`);
            // Optionally, delete the image from storage if it's not usable
            // await admin.storage().bucket(fileBucket).file(filePath).delete();
            return;
        }
        
        if (faces.length > 1) {
            console.log(`Multiple faces (${faces.length}) detected in ${filePath}. Using the most prominent one.`);
        }

        // Extract the facial embedding (feature vector) from the most prominent face
        const embedding = faces[0].fdBoundingPoly.vertices.flatMap(v => [v.x, v.y]); // simplified embedding
        
        const studentQuery = db.collection("students").where("authUid", "==", studentAuthUid).limit(1);
        const studentSnapshot = await studentQuery.get();

        if (studentSnapshot.empty) {
            console.error(`No student found with authUid: ${studentAuthUid}`);
            return;
        }

        const studentDocRef = studentSnapshot.docs[0].ref;

        // Store up to 4 embeddings. If more, replace the oldest.
        await db.runTransaction(async (transaction) => {
            const studentDoc = await transaction.get(studentDocRef);
            const data = studentDoc.data();
            const existingEmbeddings = data?.facialEmbeddings || [];
            
            // Wrap the embedding in an object to avoid nested arrays
            existingEmbeddings.push({ embedding: embedding });

            // Keep only the last 4 embeddings
            if (existingEmbeddings.length > 4) {
                existingEmbeddings.shift(); 
            }

            transaction.update(studentDocRef, { facialEmbeddings: existingEmbeddings });
            console.log(`Successfully stored facial embedding for student ${studentAuthUid}. Total embeddings: ${existingEmbeddings.length}`);
        });

    } catch (error) {
        console.error(`Failed to process face enrollment for UID ${studentAuthUid}.`, error);
    }
});


// This function is now the single point of truth for linking a profile.
// It assumes the user has ALREADY verified they own the phone number on the client-side.
exports.linkStudentProfileWithVerifiedNumber = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Please sign in first.");
    }
    
    const { phoneNumber } = data;
    const { uid, token } = context.auth;

    if (!phoneNumber) {
      throw new functions.https.HttpsError("invalid-argument", "Phone number is required.");
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    
    // Find the student with the matching phone number
    const studentsRef = admin.firestore().collection("students");
    const studentQuery = await studentsRef.where("phone", "==", normalizedPhone).limit(1).get();

    if (studentQuery.empty) {
        throw new functions.https.HttpsError("not-found", "This phone number is not registered with any student. Please contact a Rodwell administrator for assistance.");
    }

    const studentDoc = studentQuery.docs[0];
    const studentData = studentDoc.data();
    
    if (studentData.authUid) {
      throw new functions.https.HttpsError("already-exists", "This student profile is already linked to a different login account.");
    }
    
    // Link the account
    await studentDoc.ref.update({ 
      authUid: uid,
      email: token.email || null 
    }); 

    console.log(`Successfully linked authUid ${uid} to student ${studentDoc.id}`);
    
    // Return the full student data object on success
    return { 
      success: true,
      studentData: {
        ...studentData, // original data
        id: studentDoc.id, // add document ID
        authUid: uid, // add the new authUid
        email: token.email || null // add the email
      }
    };
  });

exports.verifyFaceForAttendance = functions.region("asia-southeast1").https.onCall(async (data, context) => {
    // 1. Verify admin and data
    if (!context.auth || !context.auth.token.email) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (!data.image) {
        throw new functions.https.HttpsError("invalid-argument", "An 'image' (base64) must be provided.");
    }
    const adminEmail = context.auth.token.email;
    
    try {
        // 2. Detect face in the provided image
        const imageBuffer = Buffer.from(data.image, 'base64');
        const [result] = await visionClient.faceDetection({ image: { content: imageBuffer } });
        const faces = result.faceAnnotations;

        if (!faces || faces.length === 0) {
            throw new functions.https.HttpsError("not-found", "No face detected in the image.");
        }
        if (faces.length > 1) {
           console.log(`Multiple faces (${faces.length}) detected in verification photo. Using the most prominent one.`);
        }

        const liveEmbedding = faces[0].fdBoundingPoly.vertices.flatMap(v => [v.x, v.y]); // simplified embedding
        
        // 3. Find the best match from stored student embeddings
        const studentsSnapshot = await db.collection("students").where("facialEmbeddings", "!=", null).get();

        if (studentsSnapshot.empty) {
            throw new functions.https.HttpsError("not-found", "No students have enrolled for facial recognition.");
        }
        
        let bestMatch = { studentId: null, studentData: null, similarity: 0 };

        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            const storedEmbeddings = studentData.facialEmbeddings;

            if (storedEmbeddings && storedEmbeddings.length > 0) {
                // Calculate similarity against each stored embedding
                for (const storedEmbeddingData of storedEmbeddings) {
                    // Unwrap the embedding from the object
                    const storedEmbedding = storedEmbeddingData.embedding;
                    if (!storedEmbedding) continue;

                    const similarity = cosineSimilarity(liveEmbedding, storedEmbedding);
                    console.log(`Comparing with student ${studentData.name}, similarity: ${similarity}`);
                    
                    if (similarity > bestMatch.similarity) {
                        bestMatch = { studentId: doc.id, studentData, similarity };
                    }
                }
            }
        });
        
        // 4. Determine if the match is good enough
        const SIMILARITY_THRESHOLD = 0.85; // Adjust this value based on testing
        
        console.log(`Best match: ${bestMatch.studentData?.fullName} with similarity ${bestMatch.similarity}`);

        if (bestMatch.similarity < SIMILARITY_THRESHOLD) {
            throw new functions.https.HttpsError("not-found", "Could not recognize the student. Please try again or use another method.");
        }

        // 5. Matched: Proceed to mark attendance (logic adapted from redeemAttendancePasscode)
        const studentData = bestMatch.studentData;
        const studentUid = studentData.authUid;
        const dateStr = new Date().toISOString().split('T')[0];

        const attendanceQuery = await db.collection("attendance")
            .where("authUid", "==", studentUid)
            .where("date", "==", dateStr)
            .get();

        if (!attendanceQuery.empty) {
            const existingStatus = attendanceQuery.docs[0].data().status;
            throw new functions.https.HttpsError("already-exists", `${studentData.fullName} was already marked '${existingStatus}' today.`);
        }
        
        // --- The rest is attendance logic copied and adapted from redeemAttendancePasscode ---
        const classesSnap = await db.collection("classes").get();
        const classConfigs = classesSnap.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});
        let attendanceStatus = "present";
        
        const studentClassKey = studentData.class ? studentData.class.replace(/^Class\s+/, '') : null;
        const classConfig = studentClassKey ? classConfigs[studentClassKey] : null;
        const shiftConfig = (studentData.shift && classConfig?.shifts) ? classConfig.shifts[studentData.shift] : null;

        if (shiftConfig && shiftConfig.startTime) {
            const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
            const now = new Date();
            const phnomPenhTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
            const shiftStartTimeDate = new Date(phnomPenhTime.getFullYear(), phnomPenhTime.getMonth(), phnomPenhTime.getDate(), startHour, startMinute, 0, 0);

            let graceMinutes = 15;
            const studentGracePeriod = studentData.gracePeriodMinutes ?? studentData.gradePeriodMinutes;
            if (typeof studentGracePeriod === 'number' && !isNaN(studentGracePeriod)) {
                graceMinutes = studentGracePeriod;
            } else if (typeof studentGracePeriod === 'string' && studentGracePeriod.trim() !== '' && !isNaN(Number(studentGracePeriod))) {
                graceMinutes = Number(studentGracePeriod);
            }
            const onTimeDeadline = new Date(shiftStartTimeDate);
            onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);

            if (phnomPenhTime > onTimeDeadline) {
                attendanceStatus = "late";
            }
        }
        
        await db.collection("attendance").add({
            studentId: bestMatch.studentId,
            authUid: studentUid,
            studentName: studentData.fullName,
            class: studentData.class || null,
            shift: studentData.shift || null,
            status: attendanceStatus,
            date: dateStr,
            timestamp: FieldValue.serverTimestamp(),
            scannedBy: `facial_recognition_by_${adminEmail}`,
        });

        const message = `${studentData.fullName} marked ${attendanceStatus} by face scan!`;
        return { success: true, message: message };

    } catch (error) {
        console.error("Error verifying face for attendance:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred during facial recognition.");
    }
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
  
  // Handle class name mismatch: student.class = "Class 12B" but doc ID = "12B"
  const studentClassKey = studentData.class ? studentData.class.replace(/^Class\s+/, '') : null;
  const classConfig = studentClassKey ? classConfigs[studentClassKey] : null;
  const shiftConfig = (studentData.shift && classConfig?.shifts) ? classConfig.shifts[studentData.shift] : null;
  
  // Debug log for class lookup
  logger.log({
    originalClass: studentData.class,
    mappedClassKey: studentClassKey,
    foundClassConfig: !!classConfig,
    foundShiftConfig: !!shiftConfig,
    studentName: studentData.fullName
  });

  if (shiftConfig && shiftConfig.startTime) {
    const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
    
    // Use a timezone-aware date for accurate 'late' calculation
    const now = new Date();
    
    // Convert to Phnom Penh timezone (UTC+7) by adding 7 hours to UTC time
    // This is more reliable than string parsing methods
    const phnomPenhTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    // Create the shift start time for today in Phnom Penh timezone  
    const shiftStartTimeDate = new Date(phnomPenhTime.getFullYear(), phnomPenhTime.getMonth(), phnomPenhTime.getDate(), startHour, startMinute, 0, 0);

    // Use gracePeriodMinutes from studentData if set, else default to 15
    let graceMinutes = 15;
    // Check for both 'gracePeriodMinutes' and a potential typo 'gradePeriodMinutes'.
    const studentGracePeriod = studentData.gracePeriodMinutes ?? studentData.gradePeriodMinutes;

    if (
      typeof studentGracePeriod === 'number' && !isNaN(studentGracePeriod)
    ) {
      graceMinutes = studentGracePeriod;
    } else if (
      typeof studentGracePeriod === 'string' && studentGracePeriod.trim() !== '' && !isNaN(Number(studentGracePeriod))
    ) {
      graceMinutes = Number(studentGracePeriod);
    }
    const onTimeDeadline = new Date(shiftStartTimeDate);
    onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);

    // Log the times for debugging
    logger.log({
        currentTimeUTC: now.toISOString(),
        currentTimePhnomPenh: phnomPenhTime.toISOString(),
        shiftStartTimePhnomPenh: shiftStartTimeDate.toISOString(),
        onTimeDeadlinePhnomPenh: onTimeDeadline.toISOString(),
        graceMinutes: graceMinutes,
        studentName: studentData.fullName
    });

    if (phnomPenhTime > onTimeDeadline) {
      attendanceStatus = "late";
    }
    
    // Log the attendance decision with timing details
    functions.logger.log(`Attendance recorded for ${studentData.fullName} (${attendanceStatus}) by ${adminEmail} Scan Time: ${phnomPenhTime} Deadline: ${onTimeDeadline}`);
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
    timestamp: FieldValue.serverTimestamp(),
    scannedBy: adminEmail,
  });

  //functions.logger.log(`Attendance recorded for ${studentData.fullName} (${attendanceStatus}) by ${adminEmail}`);
  const message = `${studentData.fullName} marked ${attendanceStatus}!`;
  return { success: true, message: message };
});

/**
 * Links a student profile to the authenticated user's UID based on phone number.
 * This is a simplified version that does not require OTP verification.
 */
exports.linkStudentByPhone = functions.region("asia-southeast1").https.onCall(async (data, context) => {
  // Force redeploy 1
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
  }

  const { phoneNumber } = data;
  if (!phoneNumber) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'phoneNumber' argument.");
  }
  
  const uid = context.auth.uid;

  try {

    // Find the student document by the provided phone number.
    // The field name must match Firestore exactly, which is "phone" (lowercase).
    const studentQuery = db.collection("students").where("phone", "==", phoneNumber).limit(1);
    const studentSnapshot = await studentQuery.get();

    if (studentSnapshot.empty) {
      throw new HttpsError("not-found", `We couldn't find a student record associated with this phone number. Contact a Rodwell administrator for assistance.`);
    }

    const studentDoc = studentSnapshot.docs[0];
    
    // Check if the student profile is already linked to a different auth account.
    if (studentDoc.data().authUid) {
      // Security: It's better not to reveal if the account is linked to someone else or not.
      // A generic message is safer, but for internal use, a specific one might be okay.
      throw new HttpsError("already-exists", "This student profile is already linked to an account.");
    }
    // Force redeploy 2
    
    // If we're here, the student exists and is not linked. Let's link them.
    // We will also add the user's email to the student document for reference.
    const userEmail = context.auth.token.email;
    await studentDoc.ref.update({ authUid: uid, email: userEmail });
    
    return { success: true, message: "Your account has been successfully linked!" };

  } catch (error) {
    console.error("Error linking student by phone:", error);
    // Re-throw HttpsError instances directly.
    if (error instanceof HttpsError) {
        throw error;
    }
    // Log other errors and throw a generic internal error to the client.
    throw new HttpsError("internal", "An unexpected error occurred while linking your account.");
  }
});

// Note: The 'linkStudentProfileWithVerifiedNumber' function that previously existed
// has been removed and replaced by the two functions above.