import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ==================== USER MANAGEMENT ====================

/**
 * Create user profile on signup
 * Trigger: Auth onCreate
 */
export const createUserProfile = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user) => {
    try {
      const userData = {
        id: user.uid,
        email: user.email,
        username: user.email?.split('@')[0] || '',
        displayName: user.displayName || '',
        profileImageUrl: user.photoURL || '',
        bio: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        followerCount: 0,
        followingCount: 0,
        recordingCount: 0,
        interests: [],
        isVerified: false,
      };

      await db.collection('users').doc(user.uid).set(userData);
      functions.logger.info(`User profile created for ${user.uid}`);
    } catch (error) {
      functions.logger.error(`Error creating user profile: ${error}`);
      throw error;
    }
  });

/**
 * Delete user data on account deletion
 * Trigger: Auth onDelete
 */
export const deleteUserData = functions
  .region('europe-west1')
  .auth.user()
  .onDelete(async (user) => {
    try {
      // Delete user document
      await db.collection('users').doc(user.uid).delete();

      // Delete user's recordings
      const recordings = await db
        .collection('recordings')
        .where('userId', '==', user.uid)
        .get();

      for (const doc of recordings.docs) {
        await doc.ref.delete();
      }

      // Delete user's comments
      const comments = await db
        .collection('comments')
        .where('userId', '==', user.uid)
        .get();

      for (const doc of comments.docs) {
        await doc.ref.delete();
      }

      functions.logger.info(`User data deleted for ${user.uid}`);
    } catch (error) {
      functions.logger.error(`Error deleting user data: ${error}`);
      throw error;
    }
  });

// ==================== RECORDING MANAGEMENT ====================

/**
 * Update recording statistics when comment is created
 * Trigger: Firestore onCreate /comments/{commentId}
 */
export const updateRecordingOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{commentId}')
  .onCreate(async (snap) => {
    try {
      const comment = snap.data();
      const recordingRef = db.collection('recordings').doc(comment.recordingId);

      await recordingRef.update({
        commentCount: admin.firestore.FieldValue.increment(1),
      });

      // Create activity
      await createActivity(comment.recordingId, 'comment', comment.userId, {
        recordingId: comment.recordingId,
        userId: comment.userId,
      });

      functions.logger.info(`Recording stats updated for ${comment.recordingId}`);
    } catch (error) {
      functions.logger.error(`Error updating recording stats: ${error}`);
      throw error;
    }
  });

/**
 * Update recording statistics when reaction is created
 * Trigger: Firestore onCreate /reactions/{reactionId}
 */
export const updateRecordingOnReaction = functions
  .region('europe-west1')
  .firestore.document('reactions/{reactionId}')
  .onCreate(async (snap) => {
    try {
      const reaction = snap.data();
      const recordingRef = db.collection('recordings').doc(reaction.recordingId);

      await recordingRef.update({
        likeCount: admin.firestore.FieldValue.increment(1),
      });

      // Create activity
      await createActivity(reaction.recordingId, 'reaction', reaction.userId, {
        recordingId: reaction.recordingId,
        userId: reaction.userId,
        type: reaction.type,
      });

      functions.logger.info(`Recording reaction updated for ${reaction.recordingId}`);
    } catch (error) {
      functions.logger.error(`Error updating recording reaction: ${error}`);
      throw error;
    }
  });

/**
 * Delete recording data when recording is deleted
 * Trigger: Firestore onDelete /recordings/{recordingId}
 */
export const deleteRecordingData = functions
  .region('europe-west1')
  .firestore.document('recordings/{recordingId}')
  .onDelete(async (snap) => {
    try {
      const recording = snap.data();
      const recordingId = snap.id;

      // Delete comments
      const comments = await db
        .collection('comments')
        .where('recordingId', '==', recordingId)
        .get();

      for (const doc of comments.docs) {
        await doc.ref.delete();
      }

      // Delete reactions
      const reactions = await db
        .collection('reactions')
        .where('recordingId', '==', recordingId)
        .get();

      for (const doc of reactions.docs) {
        await doc.ref.delete();
      }

      // Update user recording count
      await db
        .collection('users')
        .doc(recording.userId)
        .update({
          recordingCount: admin.firestore.FieldValue.increment(-1),
        });

      functions.logger.info(`Recording data deleted for ${recordingId}`);
    } catch (error) {
      functions.logger.error(`Error deleting recording data: ${error}`);
      throw error;
    }
  });

// ==================== SOCIAL FEATURES ====================

/**
 * Update follow counts when follow is created
 * Trigger: Firestore onCreate /follows/{followId}
 */
export const updateFollowCounts = functions
  .region('europe-west1')
  .firestore.document('follows/{followId}')
  .onCreate(async (snap) => {
    try {
      const follow = snap.data();

      // Increment following count for follower
      await db
        .collection('users')
        .doc(follow.followerId)
        .update({
          followingCount: admin.firestore.FieldValue.increment(1),
        });

      // Increment follower count for following
      await db
        .collection('users')
        .doc(follow.followingId)
        .update({
          followerCount: admin.firestore.FieldValue.increment(1),
        });

      functions.logger.info(`Follow counts updated: ${follow.followerId} -> ${follow.followingId}`);
    } catch (error) {
      functions.logger.error(`Error updating follow counts: ${error}`);
      throw error;
    }
  });

/**
 * Update follow counts when follow is deleted
 * Trigger: Firestore onDelete /follows/{followId}
 */
export const decrementFollowCounts = functions
  .region('europe-west1')
  .firestore.document('follows/{followId}')
  .onDelete(async (snap) => {
    try {
      const follow = snap.data();

      // Decrement following count
      await db
        .collection('users')
        .doc(follow.followerId)
        .update({
          followingCount: admin.firestore.FieldValue.increment(-1),
        });

      // Decrement follower count
      await db
        .collection('users')
        .doc(follow.followingId)
        .update({
          followerCount: admin.firestore.FieldValue.increment(-1),
        });

      functions.logger.info(`Follow counts decremented: ${follow.followerId} -> ${follow.followingId}`);
    } catch (error) {
      functions.logger.error(`Error decrementing follow counts: ${error}`);
      throw error;
    }
  });

// ==================== HELPER FUNCTIONS ====================

/**
 * Create activity record for user feed
 */
async function createActivity(
  recordingId: string,
  type: string,
  userId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const recording = await db.collection('recordings').doc(recordingId).get();
    if (!recording.exists) return;

    const recordingData = recording.data();
    const recordingOwnerId = recordingData?.userId;

    if (recordingOwnerId === userId) return; // Don't create activity for own action

    await db.collection('activities').add({
      userId: recordingOwnerId,
      type,
      targetId: recordingId,
      targetType: 'recording',
      actorId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata,
    });
  } catch (error) {
    functions.logger.error(`Error creating activity: ${error}`);
  }
}

// ==================== PUBSUB & SCHEDULED TASKS ====================

/**
 * Clean up old temporary files
 * Trigger: Cloud Scheduler - Daily at 2 AM
 */
export const cleanupTempFiles = functions
  .region('europe-west1')
  .pubsub.schedule('0 2 * * *')
  .timeZone('Europe/Budapest')
  .onRun(async (context) => {
    try {
      const bucket = admin.storage().bucket();
      const files = await bucket.getFiles({ prefix: 'temp/' });

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const file of files[0]) {
        const metadata = await file.getMetadata();
        const updated = new Date(metadata[0].updated);

        if (updated < twentyFourHoursAgo) {
          await file.delete();
          functions.logger.info(`Deleted temp file: ${file.name}`);
        }
      }

      functions.logger.info('Temp file cleanup completed');
    } catch (error) {
      functions.logger.error(`Error cleaning up temp files: ${error}`);
      throw error;
    }
  });

/**
 * Archive old activities
 * Trigger: Cloud Scheduler - Weekly on Sunday at 3 AM
 */
export const archiveOldActivities = functions
  .region('europe-west1')
  .pubsub.schedule('0 3 * * 0')
  .timeZone('Europe/Budapest')
  .onRun(async (context) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const snapshot = await db
        .collection('activities')
        .where('createdAt', '<', thirtyDaysAgo)
        .limit(1000)
        .get();

      let deletedCount = 0;

      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        deletedCount++;
      }

      functions.logger.info(`Archived ${deletedCount} old activities`);
    } catch (error) {
      functions.logger.error(`Error archiving activities: ${error}`);
      throw error;
    }
  });

export default {
  createUserProfile,
  deleteUserData,
  updateRecordingOnComment,
  updateRecordingOnReaction,
  deleteRecordingData,
  updateFollowCounts,
  decrementFollowCounts,
  cleanupTempFiles,
  archiveOldActivities,
};
