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
const axios = require("axios");

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = getFirestore();
// Vision client is no longer needed for enrollment embeddings
// const visionClient = new vision.ImageAnnotatorClient();

// --- NEW: Define the URL for your Python face recognition service ---
const FACE_RECOGNITION_SERVICE_URL = "https://face-recognition-service-50079853705.asia-southeast1.run.app/generate-embedding";

// --- The embedding logic is now handled by the Python service ---
// function createNormalizedEmbedding(face) { ... } // This function is no longer needed.

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
let studentEmbeddingsCache = {
    data: [], // Will store { studentId, studentData, storedEmbeddings }
    timestamp: 0,
};

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
        // 1. Download the image from GCS into a buffer
        const bucket = admin.storage().bucket(fileBucket);
        const file = bucket.file(filePath);
        const [imageBuffer] = await file.download();
        
        // 2. Send image to Python service to get the FaceNet embedding
        console.log(`Sending image to ML service for embedding generation...`);
        const response = await axios.post(FACE_RECOGNITION_SERVICE_URL, {
            image: imageBuffer.toString('base64')
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const { embedding } = response.data;

        if (!embedding || embedding.length === 0) {
            console.error(`ML service failed to generate an embedding for ${filePath}.`);
            return;
        }
        
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
            
            existingEmbeddings.push(embedding);

            // Keep only the last 4 embeddings
            if (existingEmbeddings.length > 4) {
                existingEmbeddings.shift(); 
            }

            transaction.update(studentDocRef, { facialEmbeddings: existingEmbeddings });
            console.log(`Successfully stored new FaceNet embedding for student ${studentAuthUid}. Total embeddings: ${existingEmbeddings.length}`);
        });

    } catch (error) {
        console.error(`Failed to process face enrollment for UID ${studentAuthUid}.`, error.response ? error.response.data : error);
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

exports.recognizeAndMarkAttendance = functions
  .region('asia-southeast1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      // 1. Verify admin credentials and input data
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authentication required.' });
      }
      const idToken = req.headers.authorization.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Invalid authentication token.' });
      }
      
      const adminEmail = decodedToken.email;

      if (!req.body.image) {
          return res.status(400).json({ error: 'An \'image\' (base64 encoded) must be provided.' });
      }
      const imageBuffer = Buffer.from(req.body.image, 'base64');

      console.log(`Request from admin: ${adminEmail}`);

      try {
          // 2. Use Vision AI to detect faces in the provided image
          const [result] = await visionClient.faceDetection({ image: { content: imageBuffer } });
          const faces = result.faceAnnotations;

          if (!faces || faces.length === 0) {
              return res.status(200).json({ status: 'no_face_detected', message: "No face was detected in the image." });
          }
          if (faces.length > 1) {
              console.log(`Multiple faces (${faces.length}) detected, using the most prominent one.`);
          }

          // --- FIX: Use the new standardized embedding function for the live face ---
          const liveEmbedding = createNormalizedEmbedding(faces[0]);
          
          if (!liveEmbedding) {
              return res.status(200).json({ status: 'no_face_data', message: "Detected a face, but could not extract its geometric features for comparison." });
          }

          // --- OPTIMIZATION: Use a 5-minute in-memory cache for student embeddings ---
          let allStudentsWithEmbeddings = [];
          const now = Date.now();

          if (now - studentEmbeddingsCache.timestamp < CACHE_DURATION_MS && studentEmbeddingsCache.data.length > 0) {
              console.log(`Using cached student embeddings. Cache size: ${studentEmbeddingsCache.data.length}`);
              allStudentsWithEmbeddings = studentEmbeddingsCache.data;
          } else {
              console.log("Cache is stale or empty. Fetching fresh student embeddings from Firestore.");
              // --- FIX: The query was incorrect, it should be '!=' not '==' ---
              const studentsSnapshot = await db.collection("students").where("facialEmbeddings", "!=", []).get();

              if (studentsSnapshot.empty) {
                  return res.status(404).json({ error: 'No students have enrolled for facial recognition.' });
              }
              
              const freshEmbeddings = [];
              for (const doc of studentsSnapshot.docs) {
                  freshEmbeddings.push({
                      studentId: doc.id,
                      studentData: doc.data(),
                      storedEmbeddings: doc.data().facialEmbeddings || [],
                  });
              }
              
              studentEmbeddingsCache = { data: freshEmbeddings, timestamp: now };
              allStudentsWithEmbeddings = freshEmbeddings;
              console.log(`Successfully fetched and cached embeddings for ${allStudentsWithEmbeddings.length} students.`);
          }
          
          // 4. Find the best match by comparing the live face with the cached embeddings
          let bestMatch = { studentId: null, studentData: null, similarity: 0 };
          for (const student of allStudentsWithEmbeddings) {
              const { studentId, studentData, storedEmbeddings } = student;
              
              for (const storedEmbedding of storedEmbeddings) {
                  if (!storedEmbedding) continue;

                  const similarity = cosineSimilarity(liveEmbedding, storedEmbedding);
                  if (similarity > bestMatch.similarity) {
                      bestMatch = { studentId, studentData, similarity };
                  }
              }
          }
          
          // 5. If match is weak, return "unknown"
          // --- FIX: Increased threshold for more accurate, normalized matching ---
          const SIMILARITY_THRESHOLD = 0.92; // Stricter confidence threshold
          if (bestMatch.similarity < SIMILARITY_THRESHOLD) {
              return res.status(200).json({ 
                  status: 'unknown_student', 
                  message: `No confident match found. Best similarity: ${(bestMatch.similarity * 100).toFixed(2)}%`,
                  similarity: bestMatch.similarity 
              });
          }

          const studentData = bestMatch.studentData;
          const studentUid = studentData.authUid;

          // --- FIX: Get classId by transforming the 'class' field (e.g., "Class 12C" -> "12C") ---
          if (!studentData.class) {
              console.error(`Student ${studentData.fullName} (${bestMatch.studentId}) is missing a class assignment.`);
              return res.status(400).json({
                  status: 'error_missing_class',
                  studentName: studentData.fullName,
                  message: `Recognized ${studentData.fullName}, but they are not assigned to a class.`,
              });
          }
          const classId = studentData.class.replace(/^Class\s+/, ''); // "Class 12C" -> "12C"

          // 6. Check if student has already been marked for attendance today
          const today = new Date().toISOString().split('T')[0];
          const attendanceQuery = await db.collection("attendance")
              .where("authUid", "==", studentUid)
              .where("date", "==", today)
              .get();

          if (!attendanceQuery.empty) {
              const docData = attendanceQuery.docs[0].data();
              return res.status(200).json({ 
                  status: 'already_marked',
                  studentName: studentData.fullName,
                  checkInTime: docData.checkInTime,
                  attendanceStatus: docData.status,
                  message: `${studentData.fullName} has already been marked ${docData.status}.`
              });
          }
          
          // 7. Mark Attendance (Logic aligned with verifyFaceForAttendance)
          const classesSnap = await db.collection("classes").doc(classId).get();
          if (!classesSnap.exists) {
              return res.status(404).json({ error: `Class configuration for '${classId}' not found.` });
          }
          const classConfig = classesSnap.data();
          
          let attendanceStatus = "present"; // Default status, aligned with other functions
          
          const shiftConfig = (studentData.shift && classConfig.shifts) ? classConfig.shifts[studentData.shift] : null;

          if (shiftConfig && shiftConfig.startTime) {
              const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
              
              const now = new Date();
              // Use timezone-aware date for accurate 'late' calculation (UTC+7 for Phnom Penh)
              const phnomPenhTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
              const shiftStartTimeDate = new Date(phnomPenhTime.getFullYear(), phnomPenhTime.getMonth(), phnomPenhTime.getDate(), startHour, startMinute, 0, 0);

              // Use student-specific grace period, with fallback to typo and then default.
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
          } else {
              console.warn(`Could not determine late status for ${studentData.fullName}. No valid shift config found for shift: '${studentData.shift}'`);
          }
          
          const attendanceRecord = {
              studentId: bestMatch.studentId,
              authUid: studentUid,
              studentName: studentData.fullName,
              class: studentData.class || null,
              shift: studentData.shift || null,
              status: attendanceStatus,
              date: today,
              timestamp: FieldValue.serverTimestamp(),
              scannedBy: `Face Recognition via ${adminEmail}`,
          };

          await db.collection("attendance").add(attendanceRecord);
          
          console.log(`Successfully marked attendance for ${studentData.fullName} with status: ${attendanceStatus}`);

          // 8. Return success response
          return res.status(200).json({ 
              status: 'success', 
              studentName: studentData.fullName,
              similarity: bestMatch.similarity,
              attendanceStatus: attendanceStatus,
              message: `Successfully marked ${studentData.fullName} as ${attendanceStatus}.`
          });

      } catch (error) {
          console.error("Error in recognizeAndMarkAttendance:", error);
          if (error instanceof functions.https.HttpsError) {
              throw error;
          }
          return res.status(500).json({ error: "An unexpected error occurred during face recognition." });
      }
    });
  });

exports.verifyFaceForAttendance = functions.region("asia-southeast1").https.onCall(async (data, context) => {
    // 1. Verify admin and data
    if (!context.auth || !context.auth.token.isAdmin) {
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

        // --- FIX: Use the new standardized embedding function ---
        const liveEmbedding = createNormalizedEmbedding(faces[0]);
        if (!liveEmbedding) {
            throw new functions.https.HttpsError("internal", "Could not extract geometric features from the detected face.");
        }
        
        // 3. Find the best match from stored student embeddings
        const studentsSnapshot = await db.collection("students").where("facialEmbeddings", "!=", []).get();

        if (studentsSnapshot.empty) {
            throw new functions.https.HttpsError("not-found", "No students have enrolled for facial recognition.");
        }
        
        let bestMatch = { studentId: null, studentData: null, similarity: 0 };

        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            const storedEmbeddings = studentData.facialEmbeddings;

            if (storedEmbeddings && storedEmbeddings.length > 0) {
                // Calculate similarity against each stored embedding
                for (const storedEmbedding of storedEmbeddings) {
                    // --- FIX: The embedding is now stored directly, not in an object ---
                    if (!storedEmbedding) continue;

                    const similarity = cosineSimilarity(liveEmbedding, storedEmbedding);
                    console.log(`Comparing with student ${studentData.fullName}, similarity: ${similarity}`);
                    
                    if (similarity > bestMatch.similarity) {
                        bestMatch = { studentId: doc.id, studentData, similarity };
                    }
                }
            }
        });
        
        // 4. Determine if the match is good enough
        // --- FIX: Use the same strict threshold as the other function ---
        const SIMILARITY_THRESHOLD = 0.95; 
        
        console.log(`Best match: ${bestMatch.studentData?.fullName} with similarity ${bestMatch.similarity}`);

        if (bestMatch.similarity < SIMILARITY_THRESHOLD) {
            throw new functions.https.HttpsError("not-found", "Could not recognize the student. Please try again or use another method.");
        }

        // 5. Matched: Proceed to mark attendance (logic aligned with redeemAttendancePasscode)
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
        
        // Handle class name mismatch: student.class = "Class 12B" but doc ID = "12B"
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