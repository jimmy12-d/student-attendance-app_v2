/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

exports.createStudent = functions.https.onCall(async (data, context) => {
  // 1. Authenticate the request: Ensure the user calling this function is an admin.
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }
  
  // Check if the user is an authorized admin by looking them up in the authorizedUsers collection.
  const adminEmail = context.auth.token.email;
  const adminUserRef = admin.firestore().collection("authorizedUsers").doc(adminEmail);
  const adminUserSnap = await adminUserRef.get();

  if (!adminUserSnap.exists) {
    throw new functions.https.HttpsError(
        "permission-denied",
        "You must be an admin to perform this action.",
    );
  }

  // 2. Validate the incoming data from the form.
  const {fullName, phone, className, shift} = data;
  if (!fullName || !phone || !className || !shift) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with all required fields: fullName, phone, className, shift.",
    );
  }
  
  // Format the phone number to the E.164 standard required by Firebase Auth.
  let phoneForAuth = "";
  if (phone.startsWith("+")) {
    phoneForAuth = phone;
  } else if (/^0\d{8,9}$/.test(phone)) {
    phoneForAuth = "+855" + phone.slice(1);
  } else {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid phone number format provided.",
    );
  }

  try {
    // 3. Create the user in Firebase Authentication.
    const userRecord = await admin.auth().createUser({
      phoneNumber: phoneForAuth,
      displayName: fullName,
    });
    
    // 4. Create the corresponding student document in Firestore, using the new UID as the document ID.
    const studentData = {
      fullName,
      phone, // Store the original, local phone number format
      class: className,
      shift,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("students").doc(userRecord.uid).set(studentData);

    // 5. Return a success message.
    return {
      status: "success",
      message: `Successfully created student ${fullName} with UID: ${userRecord.uid}`,
      uid: userRecord.uid,
    };
  } catch (error) {
    console.error("Error creating student:", error);
    if (error.code === "auth/phone-number-already-exists") {
      throw new functions.https.HttpsError("already-exists", "A user with this phone number already exists.");
    }
    // Throw a generic error for other issues.
    throw new functions.https.HttpsError("internal", "An unexpected error occurred while creating the student.");
  }
});
