
export type UserRole = 'SPT' | 'JPT' | 'Associate';
export type AssignableRole = 'JPT' | 'Associate';
export type AnnouncementAudience = 'all' | 'jpt-only';

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  notificationTokens?: string[]; // Array of FCM tokens for push notifications
}

export interface Message {
  id:string;
  userId: string;
  text: string;
  createdAt: string; // ISO string
  replyTo?: {
    messageId: string;
    text: string;
    userName: string;
  }
}

export interface Document {
    id: string;
    name: string;
    url: string; // In a real app, this would be a Firebase Storage URL
    uploadedBy: string;
    createdAt: string; // ISO string
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string; // ISO string
  documents?: Document[];
  audience?: AnnouncementAudience;
}

export interface Notification {
  id: string;
  type: 'announcement' | 'task' | 'chat' | 'document' | 'transfer' | 'unassign';
  title: string;
  description: string;
  createdAt: string; // ISO string
  read: boolean;
  link: string;
  recipientId: string; // The user who should receive this notification
}

export interface Task {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: 'Open' | 'In Progress' | 'Completed';
  createdBy: string; // userId of JPT or SPT
  assignableTo: AssignableRole[]; // Roles that can be assigned this task
  assignedTo: string[]; // Array of user IDs
  requiredAssociates?: number;
  requiredJpts?: number;
  createdAt: string; // ISO string
  deadline?: string; // ISO string
  completedAt?: string; // ISO string
  messages?: Message[];
  documents?: Document[];
  isAnonymous?: boolean;
}
