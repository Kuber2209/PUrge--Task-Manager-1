

import { db } from '@/lib/firebase';
import type { User, Task, Announcement, AnnouncementAudience, Resource } from '@/lib/types';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  limit,
  getCountFromServer,
} from 'firebase/firestore';

// == USER FUNCTIONS ==

// Create or update a user profile
export const createUserProfile = async (user: User): Promise<void> => {
  const userRef = doc(db, 'users', user.id);
  await setDoc(userRef, user, { merge: true });
};

// Update a user profile
export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
}

// Get a single user profile
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return docSnap.data() as User;
  }
  return null;
};

// Get all users
export const getUsers = async (status?: 'pending' | 'active' | 'not-pending-or-declined'): Promise<User[]> => {
    const usersCollection = collection(db, 'users');
    let q;

    if (status === 'pending') {
        q = query(usersCollection, where('status', '==', 'pending'));
    } else if (status === 'active') {
        q = query(usersCollection, where('status', '==', 'active'));
    } else if (status === 'not-pending-or-declined') {
        // Fetch users with status 'active' and those without a status field.
        const activeQuery = query(usersCollection, where('status', '==', 'active'));
        const noStatusQuery = query(usersCollection, where('status', '==', null)); // This won't work for non-existent fields.
        
        const [activeSnapshot, allUsersSnapshot] = await Promise.all([
            getDocs(activeQuery),
            getDocs(query(usersCollection))
        ]);
        
        const activeUsers = activeSnapshot.docs.map(doc => doc.data() as User);
        const noStatusUsers = allUsersSnapshot.docs
            .map(doc => doc.data() as User)
            .filter(user => user.status === undefined);

        const allRelevantUsers = [...activeUsers, ...noStatusUsers];
        const uniqueUsers = Array.from(new Map(allRelevantUsers.map(user => [user.id, user])).values());
        return uniqueUsers;

    } else {
        q = query(usersCollection);
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as User);
}

// == BLACKLIST FUNCTIONS ==
export const addEmailToBlacklist = async (email: string): Promise<void> => {
    if (!email) return;
    const blacklistRef = doc(db, 'blacklist', email.toLowerCase());
    await setDoc(blacklistRef, { email: email.toLowerCase(), createdAt: new Date().toISOString() });
};

export const removeEmailFromBlacklist = async (email: string): Promise<void> => {
    const blacklistRef = doc(db, 'blacklist', email.toLowerCase());
    await deleteDoc(blacklistRef);
};

export const isEmailBlacklisted = async (email: string): Promise<boolean> => {
    if (!email) return false;
    const blacklistRef = doc(db, 'blacklist', email.toLowerCase());
    const docSnap = await getDoc(blacklistRef);
    return docSnap.exists();
};

export const getBlacklist = (callback: (emails: { id: string, email: string }[]) => void): (() => void) => {
    const blacklistCollection = collection(db, 'blacklist');
    const q = query(blacklistCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
        const emails = querySnapshot.docs.map(doc => ({ id: doc.id, email: doc.data().email as string }));
        callback(emails);
    });
};


// == WHITELIST FUNCTIONS ==

// Add an email to the whitelist
export const addEmailToWhitelist = async (email: string): Promise<void> => {
    if (!email) return;
    const whitelistRef = doc(db, 'whitelist', email.toLowerCase());
    await setDoc(whitelistRef, { email: email.toLowerCase(), createdAt: new Date().toISOString() });
};

// Remove an email from the whitelist
export const removeEmailFromWhitelist = async (email: string): Promise<void> => {
    const whitelistRef = doc(db, 'whitelist', email.toLowerCase());
    await deleteDoc(whitelistRef);
};

// Check if an email is whitelisted
export const isEmailWhitelisted = async (email: string): Promise<boolean> => {
    if (!email) return false;
    const whitelistRef = doc(db, 'whitelist', email.toLowerCase());
    const docSnap = await getDoc(whitelistRef);
    return docSnap.exists();
};

// Get all whitelisted emails with real-time updates
export const getWhitelist = (callback: (emails: { id: string, email: string }[]) => void): (() => void) => {
    const whitelistCollection = collection(db, 'whitelist');
    const q = query(whitelistCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
        const emails = querySnapshot.docs.map(doc => ({ id: doc.id, email: doc.data().email as string }));
        callback(emails);
    });
};


// == TASK FUNCTIONS ==

// Create a new task
export const createTask = async (taskData: Omit<Task, 'id'>): Promise<Task> => {
  const tasksCollection = collection(db, 'tasks');
  const docRef = await addDoc(tasksCollection, taskData);
  return { id: docRef.id, ...taskData };
};

// Get a single task with real-time updates
export const getTask = (taskId: string, callback: (task: Task | null) => void): (() => void) => {
    const taskRef = doc(db, 'tasks', taskId);
    return onSnapshot(taskRef, (docSnap) => {
        if(docSnap.exists()){
            callback({ id: docSnap.id, ...docSnap.data() } as Task);
        } else {
            callback(null);
        }
    });
}

// Get all tasks (for initial load or specific views)
export const getTasks = async (): Promise<Task[]> => {
    const tasksCollection = collection(db, 'tasks');
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

// Get all tasks relevant for a user's calendar view (assigned to or created by)
export const getCalendarTasksForUser = (userId: string, callback: (tasks: Task[]) => void): (() => void) => {
    const tasksCollection = collection(db, 'tasks');
    
    // We need two separate queries because Firestore doesn't support 'OR' queries on different fields.
    const assignedQuery = query(tasksCollection, where('assignedTo', 'array-contains', userId));
    const createdQuery = query(tasksCollection, where('createdBy', '==', userId));

    let initialLoadComplete = false;
    const combinedTasks: { [key: string]: Task } = {};

    const updateCallback = () => {
        const tasks = Object.values(combinedTasks);
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(tasks);
    };

    const unsubscribeAssigned = onSnapshot(assignedQuery, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            const task = { id: change.doc.id, ...change.doc.data() } as Task;
            if (change.type === 'removed') {
                delete combinedTasks[task.id];
            } else {
                combinedTasks[task.id] = task;
            }
        });
        if (initialLoadComplete) updateCallback();
    });

    const unsubscribeCreated = onSnapshot(createdQuery, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            const task = { id: change.doc.id, ...change.doc.data() } as Task;
            if (change.type === 'removed') {
                delete combinedTasks[task.id];
            } else {
                combinedTasks[task.id] = task;
            }
        });
        if (initialLoadComplete) updateCallback();
    });

    // Fire the initial callback after both listeners have fired at least once
    Promise.all([
        getDocs(assignedQuery),
        getDocs(createdQuery)
    ]).then(() => {
        initialLoadComplete = true;
        updateCallback();
    });

    // Return a function that unsubscribes from both listeners
    return () => {
        unsubscribeAssigned();
        unsubscribeCreated();
    };
}


// Get tasks created by a specific user with real-time updates
export const getTasksCreatedByUser = (userId: string, callback: (tasks: Task[]) => void): (() => void) => {
    const tasksCollection = collection(db, 'tasks');
    const q = query(tasksCollection, where('createdBy', '==', userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
        const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        callback(tasks);
    });
}

// Get tasks assigned to a specific user with real-time updates
export const getTasksAssignedToUser = (userId: string, callback: (tasks: Task[]) => void): (() => void) => {
    const tasksCollection = collection(db, "tasks");
    const q = query(tasksCollection, where('assignedTo', 'array-contains', userId));

    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        // Sort tasks by creation date on the client side, which is safe.
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(tasks);
    });
}


// Get all open tasks with real-time updates
export const getOpenTasks = (callback: (tasks: Task[]) => void): (() => void) => {
    const tasksCollection = collection(db, 'tasks');
    const q = query(tasksCollection, where('status', '==', 'Open'));
    return onSnapshot(q, (querySnapshot) => {
        const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(tasks);
    });
}

// Get all ongoing tasks with real-time updates
export const getOngoingTasks = (callback: (tasks: Task[]) => void): (() => void) => {
    const tasksCollection = collection(db, 'tasks');
    const q = query(tasksCollection, where('status', 'in', ['Open', 'In Progress']));
    return onSnapshot(q, (querySnapshot) => {
        const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(tasks);
    });
};


// Update a task
export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  const { ...updateData } = updates;
  if(updateData.completedAt === undefined) {
    // Firestore does not allow `undefined` values.
    // If we are un-completing, we need to remove the field.
    // To do this with updateDoc, we can pass it to the object and then delete it.
    delete updateData.completedAt;
  }
  await updateDoc(taskRef, updateData);
};

// Delete a task
export const deleteTask = async (taskId: string): Promise<void> => {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
}

// Get all users associated with a task (creator, assignees, commenters)
export const getTaskUsers = async (task: Task): Promise<User[]> => {
    const userIds = new Set<string>();
    userIds.add(task.createdBy);
    task.assignedTo.forEach(userId => userIds.add(userId));
    (task.messages || []).forEach(m => userIds.add(m.userId));
    (task.documents || []).forEach(d => userIds.add(d.uploadedBy));
    
    if (userIds.size === 0) return [];

    const users: User[] = [];
    // Firestore 'in' queries are limited to 30 values. Chunk the userIds array.
    const userIdChunks = Array.from(userIds).reduce((acc, item, i) => {
        const chunkIndex = Math.floor(i / 30);
        if (!acc[chunkIndex]) {
            acc[chunkIndex] = [];
        }
        acc[chunkIndex].push(item);
        return acc;
    }, [] as string[][]);

    for (const chunk of userIdChunks) {
        if (chunk.length === 0) continue;
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('id', 'in', chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            users.push(doc.data() as User);
        })
    }
    
    return users;
}


// == ANNOUNCEMENT FUNCTIONS ==

// Create a new announcement
export const createAnnouncement = async (announcementData: Omit<Announcement, 'id'>): Promise<Announcement> => {
  const announcementsCollection = collection(db, 'announcements');
  const docRef = await addDoc(announcementsCollection, announcementData);
  return { id: docRef.id, ...announcementData };
};

// Get all announcements with real-time updates based on user role
export const getAnnouncements = (currentUser: User, callback: (announcements: Announcement[]) => void): (() => void) => {
  const announcementsCollection = collection(db, 'announcements');
  
  let q;
  if (currentUser.role === 'Associate') {
    // Associates only see 'all' audience announcements
    q = query(announcementsCollection, where('audience', '==', 'all'), orderBy('createdAt', 'desc'));
  } else {
    // JPTs and SPTs see everything
    q = query(announcementsCollection, orderBy('createdAt', 'desc'));
  }

  return onSnapshot(q, (querySnapshot) => {
    const announcements = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
    callback(announcements);
  });
};

// Update an announcement
export const updateAnnouncement = async (announcementId: string, updates: Partial<Omit<Announcement, 'id'>>): Promise<void> => {
    const announcementRef = doc(db, 'announcements', announcementId);
    await updateDoc(announcementRef, updates);
};

// Delete an announcement
export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
    const announcementRef = doc(db, 'announcements', announcementId);
    await deleteDoc(announcementRef);
};


// == RESOURCE FUNCTIONS ==

export const createResource = async (resourceData: Omit<Resource, 'id'>): Promise<Resource> => {
    const resourcesCollection = collection(db, 'resources');
    const docRef = await addDoc(resourcesCollection, resourceData);
    return { id: docRef.id, ...resourceData };
};

export const getResources = (callback: (resources: Resource[]) => void): (() => void) => {
    const resourcesCollection = collection(db, 'resources');
    const q = query(resourcesCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
        const resources = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
        callback(resources);
    });
}

export const updateResource = async (resourceId: string, updates: Partial<Resource>): Promise<void> => {
    const resourceRef = doc(db, 'resources', resourceId);
    await updateDoc(resourceRef, updates);
};

export const deleteResource = async (resourceId: string): Promise<void> => {
    const resourceRef = doc(db, 'resources', resourceId);
    await deleteDoc(resourceRef);
};
