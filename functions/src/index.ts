import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type { Task, Announcement, User } from "../../src/lib/types";

// Initialize the Admin SDK. This is required to access Firestore and FCM.
admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

/**
 * Sends a notification when a new message is created
 * in a task's message thread.
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
    const taskData = taskDoc.data() as Task | undefined;
    if (!taskData) {
      console.log("No task data found for taskId:", taskId);
      return;
    }

    // Determine all recipients: creator and all assigned users,
    const recipientIds = new Set<string>([
      ...taskData.assignedTo,
      taskData.createdBy,
    ]);
    recipientIds.delete(senderId); // Don't notify the per

    const recipients = Array.from(recipientIds);
    if (recipients.length === 0) {
      console.log("No recipients to notify.");
      return;
    }

    // Get the notification tokens for all recipients
    const tokens = await getTokensForUsers(recipients);

    if (tokens.length === 0) {
      console.log("No notification tokens found for any recipients.");
      return;
    }
    
    // Construct the generic notification payload
    const payload = {
      notification: {
        title: "Update from PUrge",
        body: "Open PUrge to see what's new.",
      },
      fcmOptions: {
        link: `/dashboard`,
      },
    };

    console.log(
      `Sending generic message notification to ${tokens.length} tokens.`,
    );
    return fcm.sendToDevice(tokens, payload);
  });

/**
 * Sends a notification when a new task is created.
 */
export const sendNewTaskNotification = functions.firestore
  .document("tasks/{taskId}")
  .onCreate(async (snapshot) => {
    const taskData = snapshot.data() as Task;
    if (!taskData) {
      console.log("New task data is empty, no notification sent.");
      return;
    }

    // Determine recipients based on assignable roles
    const assignableRoles = taskData.assignableTo;
    if (!assignableRoles || assignableRoles.length === 0) {
      console.log("No assignable roles for new task, no notification sent.");
      return;
    }

    const usersSnapshot = await db
      .collection("users")
      .where("role", "in", assignableRoles)
      .get();

    const recipientIds = usersSnapshot.docs
      .map((doc) => doc.data() as User)
      .filter((user) => !user.isOnHoliday) // Exclude users on holiday
      .map((user) => user.id)
      // Exclude users who are already directly assigned on creation
      .filter((id) => !taskData.assignedTo.includes(id));

    if (recipientIds.length === 0) {
      console.log("No users found for the assignable roles to notify.");
      return;
    }

    const tokens = await getTokensForUsers(recipientIds);
    if (tokens.length === 0) {
      console.log("No notification tokens found for new task recipients.");
      return;
    }

    const payload = {
      notification: {
        title: "Update from PUrge",
        body: "Open PUrge to see what's new.",
      },
      fcmOptions: {
        link: `/dashboard`, // Links to the main dashboard
      },
    };

    console.log(`Sending new task notification to ${tokens.length} tokens.`);
    return fcm.sendToDevice(tokens, payload);
  });

/**
 * Sends a notification when a new announcement is created.
 */
export const sendNewAnnouncementNotification = functions.firestore
  .document("announcements/{announcementId}")
  .onCreate(async (snapshot) => {
    const announcementData = snapshot.data() as Announcement;
    if (!announcementData) {
      return;
    }

    let usersQuery;
    // JPTs and SPTs see everything
    if (announcementData.audience === "jpt-only") {
      usersQuery = db
        .collection("users")
        .where("role", "in", ["JPT", "SPT"]);
    } else {
      // 'all' goes to everyone
      usersQuery = db.collection("users");
    }

    const usersSnapshot = await usersQuery.get();
    const recipientIds = usersSnapshot.docs
      .map((doc) => doc.id)
      .filter((id) => id !== announcementData.authorId); // 

    if (recipientIds.length === 0) {
      console.log("No recipients for announcement.");
      return;
    }

    const tokens = await getTokensForUsers(recipientIds);
    if (tokens.length === 0) {
      console.log("No notification tokens for announcement.");
      return;
    }

    const payload = {
      notification: {
        title: "Update from PUrge",
        body: "Open PUrge to see what's new.",
      },
      fcmOptions: {
        link: `/dashboard`,
      },
    };

    console.log(
      `Sending new announcement notification to ${tokens.length} tokens.`,
    );
    return fcm.sendToDevice(tokens, payload);
  });

/**
 * Helper function to get notification tokens for a list of user IDs.
 * @param {string[]} userIds An array of user IDs to fetch tokens for.
 */
async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const tokens: string[] = [];
  // Firestore 'in' queries are limited to 30 items.
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 30) {
    chunks.push(userIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    if (chunk.length > 0) {
      const tokensQuery = await db
        .collection("users")
        .where("id", "in", chunk)
        .get();

      tokensQuery.forEach((userDoc) => {
        const userData = userDoc.data() as User;
        // Only include users who are not on holiday and have tokens
        const hasTokens =
          userData.notificationTokens&&userData.notificationTokens.length>0;
          if (hasTokens && !userData.isOnHoliday) {
            // The '?? []' provides a fallback
            tokens.push(...(userData.notificationTokens ?? []));
          }
      });
    }
  }
  return [...new Set(tokens)]; // Return unique tokens
}