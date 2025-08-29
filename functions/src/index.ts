
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Admin SDK. This is required to access Firestore and FCM.
admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

/**
 * Sends a notification when a new message is created in a task's message thread.
 */
export const sendNewMessageNotification = functions.firestore
  .document("tasks/{taskId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const messageData = snapshot.data();
    if (!messageData) {
      console.log("No message data found");
      return;
    }

    const senderId = messageData.userId;
    const taskId = context.params.taskId;

    // Get the task document to find recipients and task title
    const taskDoc = await db.doc(`tasks/${taskId}`).get();
    const taskData = taskDoc.data();
    if (!taskData) {
      console.log("No task data found for taskId:", taskId);
      return;
    }

    // Determine all recipients: creator and all assigned users, except the sender
    const recipientIds = new Set<string>([
      ...taskData.assignedTo,
      taskData.createdBy,
    ]);
    recipientIds.delete(senderId); // Don't notify the person who sent the message

    const recipients = Array.from(recipientIds);
    if (recipients.length === 0) {
      console.log("No recipients to notify.");
      return;
    }

    // Get the notification tokens for all recipients
    const tokensQuery = await db.collection("users")
      .where("id", "in", recipients)
      .get();

    const tokens: string[] = [];
    tokensQuery.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.notificationTokens) {
        tokens.push(...userData.notificationTokens);
      }
    });

    if (tokens.length === 0) {
      console.log("No notification tokens found for any recipients.");
      return;
    }

    // Construct the notification payload
    const payload = {
      notification: {
        title: `New message in: ${taskData.title}`,
        body: messageData.text.substring(0, 100), // Truncate long messages
        click_action: `https://${process.env.GCLOUD_PROJECT}.web.app/task/${taskId}`,
      },
      webpush: {
        fcm_options: {
          link: `/task/${taskId}`,
        },
      },
    };

    console.log(`Sending notification to ${tokens.length} tokens.`);
    return fcm.sendToDevice(tokens, payload);
  });
