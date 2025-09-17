"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewAnnouncementNotification = exports.sendNewTaskNotification = exports.sendNewMessageNotification = void 0;
const firestore_1 = require("firebase-functions/v2/firestore"); // <-- V2 Import
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const fcm = admin.messaging();
/**
 * Sends a notification when a new message is created
 * in a task's message thread.
 */
// V2 SYNTAX: Uses onDocumentCreated and a single 'event' object
exports.sendNewMessageNotification = (0, firestore_1.onDocumentCreated)("tasks/{taskId}/messages/{messageId}", async (event) => {
    try {
        const snapshot = event.data; // <-- Get snapshot from event.data
        if (!snapshot) {
            console.log("No message data snapshot found");
            return;
        }
        const messageData = snapshot.data();
        const senderId = messageData.userId;
        const taskId = event.params.taskId; // <-- Get params from event.params
        const taskDoc = await db.doc(`tasks/${taskId}`).get();
        if (!taskDoc.exists) {
            console.log("No task data found for taskId:", taskId);
            return;
        }
        const taskData = taskDoc.data();
        const recipientIds = new Set([
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
            fcmOptions: { link: "/dashboard" },
        };
        console.log(`Sending message notification to ${tokens.length} tokens.`);
        return fcm.sendToDevice(tokens, payload);
    }
    catch (error) {
        console.error("Error in sendNewMessageNotification:", error);
        return;
    }
});
/**
 * Sends a notification when a new task is created.
 */
// V2 SYNTAX
exports.sendNewTaskNotification = (0, firestore_1.onDocumentCreated)("tasks/{taskId}", async (event) => {
    try {
        const snapshot = event.data;
        if (!snapshot) {
            console.log("New task snapshot is empty, no notification sent.");
            return;
        }
        const taskData = snapshot.data();
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
            .map((doc) => doc.data().id)
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
            fcmOptions: { link: "/dashboard" },
        };
        console.log(`Sending new task notification to ${tokens.length} tokens.`);
        return fcm.sendToDevice(tokens, payload);
    }
    catch (error) {
        console.error("Error in sendNewTaskNotification:", error);
        return;
    }
});
/**
 * Sends a notification when a new announcement is created.
 */
// V2 SYNTAX
exports.sendNewAnnouncementNotification = (0, firestore_1.onDocumentCreated)("announcements/{announcementId}", async (event) => {
    try {
        const snapshot = event.data;
        if (!snapshot) {
            return;
        }
        const announcementData = snapshot.data();
        let usersQuery;
        if (announcementData.audience === "jpt-only") {
            usersQuery = db.collection("users").where("role", "in", ["JPT", "SPT"]);
        }
        else {
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
            fcmOptions: { link: "/dashboard" },
        };
        console.log(`Sending announcement notification to ${tokens.length} tokens.`);
        return fcm.sendToDevice(tokens, payload);
    }
    catch (error) {
        console.error("Error in sendNewAnnouncementNotification:", error);
        return;
    }
});
/**
 * Helper function to get notification tokens for a list of user IDs.
 * (This function does not need to change)
 */
async function getTokensForUsers(userIds) {
    if (userIds.length === 0)
        return [];
    const tokens = [];
    const chunks = [];
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
                var _a;
                const userData = userDoc.data();
                const hasTokens = userData.notificationTokens && userData.notificationTokens.length > 0;
                if (hasTokens && !userData.isOnHoliday) {
                    tokens.push(...((_a = userData.notificationTokens) !== null && _a !== void 0 ? _a : []));
                }
            });
        }
    }
    return [...new Set(tokens)];
}
//# sourceMappingURL=index.js.map