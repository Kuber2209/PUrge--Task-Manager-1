import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import type {Task, Announcement, User} from "../../src/lib/types";

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

/**
 * Sends a notification when a new message is created
 * in a task's message thread.
 */
export const sendNewMessageNotification = onDocumentCreated(
  "tasks/{taskId}/messages/{messageId}",
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No message data snapshot found");
        return;
      }
      const messageData = snapshot.data();
      const senderId = messageData.userId;
      const taskId = event.params.taskId;

      const taskDoc = await db.doc(`tasks/${taskId}`).get();
      if (!taskDoc.exists) {
        console.log("No task data found for taskId:", taskId);
        return;
      }
      const taskData = taskDoc.data() as Task;

      const recipientIds = new Set<string>([
        ...taskData.assignedTo,
        taskData.createdBy,
      ]);
      recipientIds.delete(senderId);

      const recipients = Array.from(recipientIds);
      if (recipients.length === 0) {
        console.log("No recipients to notify.");
        return;
      }

      const tokens = await getTokensForUsers(recipients);
      if (tokens.length === 0) {
        console.log("No notification tokens found for any recipients.");
        return;
      }

      const payload = {
        notification: {
          title: "Update from PUrge",
          body: "Open PUrge to see what's new.",
        },
        fcmOptions: {link: "/dashboard"},
      };

      console.log(`Sending message notification to ${tokens.length} tokens.`);
      return fcm.sendToDevice(tokens, payload);
    } catch (error) {
      console.error("Error in sendNewMessageNotification:", error);
      return;
    }
  },
);

/**
 * Sends a notification when a new task is created.
 */
export const sendNewTaskNotification = onDocumentCreated(
  "tasks/{taskId}",
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("New task snapshot is empty, no notification sent.");
        return;
      }
      const taskData = snapshot.data() as Task;

      const assignableRoles = taskData.assignableTo;
      if (!assignableRoles || assignableRoles.length === 0) {
        console.log("No assignable roles for new task, no notification sent.");
        return;
      }

      const usersSnapshot = await db
        .collection("users")
        .where("role", "in", assignableRoles)
        .get();

      // Improved: Redundant 'isOnHoliday' check is removed here because
      // the getTokensForUsers function already handles it.
      const recipientIds = usersSnapshot.docs
        .map((doc) => (doc.data() as User).id)
        .filter((id) => !taskData.assignedTo.includes(id));

      if (recipientIds.length === 0) {
        console.log("No users found for the assignable roles to notify.");
        return;
      }

      const tokens = await getTokensForUsers(recipientIds);
      if (tokens.length === 0) {
        console.log("No notification tokens for new task recipients.");
        return;
      }

      const payload = {
        notification: {
          title: "Update from PUrge",
          body: "Open PUrge to see what's new.",
        },
        fcmOptions: {link: "/dashboard"},
      };

      console.log(`Sending new task notification to ${tokens.length} tokens.`);
      return fcm.sendToDevice(tokens, payload);
    } catch (error) {
      console.error("Error in sendNewTaskNotification:", error);
      return;
    }
  },
);

/**
 * Sends a notification when a new announcement is created.
 */
export const sendNewAnnouncementNotification = onDocumentCreated(
  "announcements/{announcementId}",
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        return;
      }
      const announcementData = snapshot.data() as Announcement;

      let usersQuery;
      if (announcementData.audience === "jpt-only") {
        usersQuery = db
          .collection("users")
          .where("role", "in", ["JPT", "SPT"]);
      } else {
        usersQuery = db.collection("users");
      }

      const usersSnapshot = await usersQuery.get();
      const recipientIds = usersSnapshot.docs
        .map((doc) => doc.id)
        .filter((id) => id !== announcementData.authorId);

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
        fcmOptions: {link: "/dashboard"},
      };

      console.log(
        `Sending announcement notification to ${tokens.length} tokens.`,
      );
      return fcm.sendToDevice(tokens, payload);
    } catch (error) {
      console.error("Error in sendNewAnnouncementNotification:", error);
      return;
    }
  },
);

/**
 * Helper function to get notification tokens for a list of user IDs.
 * @param {string[]} userIds An array of user IDs to fetch tokens for.
 * @return {Promise<string[]>} A promise that resolves with an array of tokens.
 */
async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) {
    return [];
  }

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
        const hasTokens =
          userData.notificationTokens&&userData.notificationTokens.length>0;
        if (hasTokens && !userData.isOnHoliday) {
          tokens.push(...(userData.notificationTokens ?? []));
        }
      });
    }
  }
  return [...new Set(tokens)]; // Return unique tokens
}

