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