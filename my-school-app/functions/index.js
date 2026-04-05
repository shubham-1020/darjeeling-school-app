// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if it hasn't been already.
// This check prevents re-initialization in hot reloads during development.
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable Cloud Function: addAdminRole
 * Grants the 'admin' custom claim to a user specified by email.
 *
 * IMPORTANT SECURITY NOTE:
 * For a production application, you should add robust authorization checks here.
 * This version is simplified for initial setup. See "Phase 4: Refinement"
 * for how to secure this function properly.
 *
 * @param {Object} data - The data sent from the client. Expected: { email: string }
 * @param {Object} context - The context of the function call, including authentication info.
 */
exports.addAdminRole = functions.https.onCall(async (data, context) => {
  // 1. Basic Authentication Check: Ensure the user calling this is logged in.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required. You must be logged in to assign roles.'
    );
  }

  // 2. Input Validation
  const targetEmail = data.email;
  if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.includes('@')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid email address is required to set admin role.'
    );
  }

  try {
    // Get the user record by email from Firebase Authentication
    const userRecord = await admin.auth().getUserByEmail(targetEmail);

    // Set the custom claim on the user's Firebase Auth profile
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

    // Return a success message
    return {
      message: `Success! User ${targetEmail} (UID: ${userRecord.uid}) now has admin role.`,
      uid: userRecord.uid,
      email: targetEmail
    };

  } catch (error) {
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError(
        'not-found',
        `User with email "${targetEmail}" not found in Firebase Authentication.`
      );
    }
    // Log the error for debugging on the server-side
    console.error("Error setting admin role in Cloud Function:", error);
    // Re-throw a generic HttpsError for client-side consumption
    throw new functions.https.HttpsError(
      'internal',
      `Failed to set admin role: ${error.message}`
    );
  }
});