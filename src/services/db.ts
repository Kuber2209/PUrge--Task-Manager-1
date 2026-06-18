"use client";

import { supabase } from "@/lib/supabase";
import type { User, Task, Announcement, Resource } from "@/lib/types";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// ── MAPPERS: DB (snake_case) ↔ TypeScript (camelCase) ────────────────────────

function dbToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    email: row.email,
    isOnHoliday: row.is_on_holiday ?? false,
    status: row.status,
  };
}

function userToDb(user: Partial<User>): Record<string, any> {
  const db: Record<string, any> = {};
  if (user.id !== undefined) db.id = user.id;
  if (user.name !== undefined) db.name = user.name;
  if (user.role !== undefined) db.role = user.role;
  if (user.avatar !== undefined) db.avatar = user.avatar;
  if (user.email !== undefined) db.email = user.email;
  if (user.isOnHoliday !== undefined) db.is_on_holiday = user.isOnHoliday;
  if (user.status !== undefined) db.status = user.status;
  return db;
}

function dbToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    tags: row.tags ?? [],
    status: row.status,
    createdBy: row.created_by,
    assignableTo: row.assignable_to ?? [],
    assignedTo: row.assigned_to ?? [],
    requiredAssociates: row.required_associates,
    requiredJpts: row.required_jpts,
    createdAt: row.created_at,
    deadline: row.deadline ?? undefined,
    completedAt: row.completed_at ?? undefined,
    messages: row.messages ?? [],
    documents: row.documents ?? [],
    isAnonymous: row.is_anonymous ?? false,
    voiceNoteUrl: row.voice_note_url ?? undefined,
  };
}

function taskToDb(task: Partial<Task>): Record<string, any> {
  const db: Record<string, any> = {};
  if (task.title !== undefined) db.title = task.title;
  if (task.description !== undefined) db.description = task.description;
  if (task.tags !== undefined) db.tags = task.tags;
  if (task.status !== undefined) db.status = task.status;
  if (task.createdBy !== undefined) db.created_by = task.createdBy;
  if (task.assignableTo !== undefined) db.assignable_to = task.assignableTo;
  if (task.assignedTo !== undefined) db.assigned_to = task.assignedTo;
  if (task.requiredAssociates !== undefined)
    db.required_associates = task.requiredAssociates;
  if (task.requiredJpts !== undefined) db.required_jpts = task.requiredJpts;
  if (task.createdAt !== undefined) db.created_at = task.createdAt;
  if (task.deadline !== undefined) db.deadline = task.deadline;
  if (task.completedAt !== undefined) db.completed_at = task.completedAt;
  if (task.messages !== undefined) db.messages = task.messages;
  if (task.documents !== undefined) db.documents = task.documents;
  if (task.isAnonymous !== undefined) db.is_anonymous = task.isAnonymous;
  if (task.voiceNoteUrl !== undefined) db.voice_note_url = task.voiceNoteUrl;
  return db;
}

function dbToAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    authorId: row.author_id,
    createdAt: row.created_at,
    documents: row.documents ?? [],
    audience: row.audience ?? "all",
    voiceNoteUrl: row.voice_note_url,
    isPinned: row.is_pinned ?? false,
  };
}

function announcementToDb(
  ann: Partial<Omit<Announcement, "id">>,
): Record<string, any> {
  const db: Record<string, any> = {};
  if (ann.title !== undefined) db.title = ann.title;
  if (ann.content !== undefined) db.content = ann.content;
  if (ann.authorId !== undefined) db.author_id = ann.authorId;
  if (ann.createdAt !== undefined) db.created_at = ann.createdAt;
  if (ann.documents !== undefined) db.documents = ann.documents;
  if (ann.audience !== undefined) db.audience = ann.audience;
  if (ann.voiceNoteUrl !== undefined) db.voice_note_url = ann.voiceNoteUrl;
  if (ann.isPinned !== undefined) db.is_pinned = ann.isPinned;
  return db;
}

function dbToResource(row: any): Resource {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    link: row.link,
    document: row.document,
    createdBy: row.created_by,
    createdAt: row.created_at,
    comments: row.comments ?? [],
  };
}

function resourceToDb(res: Partial<Resource>): Record<string, any> {
  const db: Record<string, any> = {};
  if (res.title !== undefined) db.title = res.title;
  if (res.description !== undefined) db.description = res.description;
  if (res.link !== undefined) db.link = res.link;
  if (res.document !== undefined) db.document = res.document;
  if (res.createdBy !== undefined) db.created_by = res.createdBy;
  if (res.createdAt !== undefined) db.created_at = res.createdAt;
  if (res.comments !== undefined) db.comments = res.comments;
  return db;
}

// ── USER FUNCTIONS ────────────────────────────────────────────────────────────

export const createUserProfile = async (user: User): Promise<void> => {
  const { error } = await supabase
    .from("users")
    .upsert(userToDb(user), { onConflict: "id" });
  if (error) throw error;
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>,
): Promise<void> => {
  const { error } = await supabase
    .from("users")
    .update(userToDb(updates))
    .eq("id", userId);
  if (error) throw error;
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data ? dbToUser(data) : null;
};

export const getUsers = async (
  status?: "pending" | "active" | "not-pending-or-declined",
): Promise<User[]> => {
  let query = supabase.from("users").select("*");

  if (status === "pending") {
    query = query.eq("status", "pending");
  } else if (status === "active") {
    query = query.eq("status", "active");
  }
  // "not-pending-or-declined" is filtered client-side to match original behaviour
  // (handles rows where status may be null/undefined)

  const { data, error } = await query;
  if (error) throw error;

  let users = (data ?? []).map(dbToUser);

  if (status === "not-pending-or-declined") {
    users = users.filter(
      (u) => u.status !== "pending" && u.status !== "declined",
    );
  }

  return users;
};

export const debarUser = async (user: User): Promise<void> => {
  const normalizedEmail = normalizeEmail(user.email);
  const [blacklistRes, updateRes] = await Promise.all([
    supabase.from("blacklist").upsert({
      email: normalizedEmail,
      created_at: new Date().toISOString(),
    }),
    supabase.from("users").update({ status: "declined" }).eq("id", user.id),
  ]);
  if (blacklistRes.error) throw blacklistRes.error;
  if (updateRes.error) throw updateRes.error;
};

// ── BLACKLIST FUNCTIONS ───────────────────────────────────────────────────────

export const addEmailToBlacklist = async (email: string): Promise<void> => {
  if (!email) return;
  const { error } = await supabase.from("blacklist").upsert({
    email: normalizeEmail(email),
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const removeEmailFromBlacklist = async (
  email: string,
): Promise<void> => {
  const { error } = await supabase
    .from("blacklist")
    .delete()
    .eq("email", normalizeEmail(email));
  if (error) throw error;
};

export const isEmailBlacklisted = async (email: string): Promise<boolean> => {
  if (!email) return false;
  const { data } = await supabase
    .from("blacklist")
    .select("email")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  return !!data;
};

export const getBlacklist = async (): Promise<
  { id: string; email: string }[]
> => {
  const { data, error } = await supabase
    .from("blacklist")
    .select("email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.email, email: row.email }));
};

// ── WHITELIST FUNCTIONS ───────────────────────────────────────────────────────

export const addEmailToWhitelist = async (email: string): Promise<void> => {
  if (!email) return;
  const { error } = await supabase.from("whitelist").upsert({
    email: normalizeEmail(email),
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const removeEmailFromWhitelist = async (
  email: string,
): Promise<void> => {
  const { error } = await supabase
    .from("whitelist")
    .delete()
    .eq("email", normalizeEmail(email));
  if (error) throw error;
};

export const isEmailWhitelisted = async (email: string): Promise<boolean> => {
  if (!email) return false;
  const { data } = await supabase
    .from("whitelist")
    .select("email")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  return !!data;
};

export const getWhitelist = async (): Promise<
  { id: string; email: string }[]
> => {
  const { data, error } = await supabase
    .from("whitelist")
    .select("email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.email, email: row.email }));
};

// ── TASK FUNCTIONS ────────────────────────────────────────────────────────────

export const createTask = async (taskData: Omit<Task, "id">): Promise<Task> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert(taskToDb(taskData))
    .select()
    .single();
  if (error) throw error;
  return dbToTask(data);
};

export const getTask = (
  taskId: string,
  callback: (task: Task | null) => void,
): (() => void) => {
  const fetchTask = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    callback(data ? dbToTask(data) : null);
  };

  fetchTask();

  const channel = supabase
    .channel(`task_${taskId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `id=eq.${taskId}`,
      },
      () => fetchTask(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToTask);
};

export const getCalendarTasksForUser = (
  userId: string,
  callback: (tasks: Task[]) => void,
): (() => void) => {
  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .or(`created_by.eq.${userId},assigned_to.cs.{${userId}}`);

    const tasks = (data ?? []).map(dbToTask);
    tasks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    callback(tasks);
  };

  fetchTasks();

  const channel = supabase
    .channel(`calendar_tasks_${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const getTasksCreatedByUser = (
  userId: string,
  callback: (tasks: Task[]) => void,
): (() => void) => {
  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    callback((data ?? []).map(dbToTask));
  };

  fetchTasks();

  const channel = supabase
    .channel(`tasks_created_${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const getTasksAssignedToUser = (
  userId: string,
  callback: (tasks: Task[]) => void,
): (() => void) => {
  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .contains("assigned_to", [userId]);

    const tasks = (data ?? []).map(dbToTask);
    tasks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    callback(tasks);
  };

  fetchTasks();

  const channel = supabase
    .channel(`tasks_assigned_${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const getOpenTasks = (
  callback: (tasks: Task[]) => void,
): (() => void) => {
  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "Open");

    const tasks = (data ?? []).map(dbToTask);
    tasks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    callback(tasks);
  };

  fetchTasks();

  const channel = supabase
    .channel("open_tasks")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const getOngoingTasks = (
  callback: (tasks: Task[]) => void,
): (() => void) => {
  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .in("status", ["Open", "In Progress"]);

    const tasks = (data ?? []).map(dbToTask);
    tasks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    callback(tasks);
  };

  fetchTasks();

  const channel = supabase
    .channel("ongoing_tasks")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const updateTask = async (
  taskId: string,
  updates: Partial<Task>,
): Promise<void> => {
  const dbData = taskToDb(updates);
  // Mirror Firestore behaviour: explicitly set completed_at to null when removing
  if ("completedAt" in updates && updates.completedAt === undefined) {
    dbData.completed_at = null;
  }
  const { error } = await supabase
    .from("tasks")
    .update(dbData)
    .eq("id", taskId);
  if (error) throw error;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
};

export const getTaskUsers = async (task: Task): Promise<User[]> => {
  const userIds = new Set<string>();
  userIds.add(task.createdBy);
  task.assignedTo.forEach((id) => userIds.add(id));
  (task.messages ?? []).forEach((m) => userIds.add(m.userId));
  (task.documents ?? []).forEach((d) => userIds.add(d.uploadedBy));

  if (userIds.size === 0) return [];

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", Array.from(userIds));

  if (error) throw error;
  return (data ?? []).map(dbToUser);
};

// ── ANNOUNCEMENT FUNCTIONS ────────────────────────────────────────────────────

export const createAnnouncement = async (
  announcementData: Omit<Announcement, "id">,
): Promise<Announcement> => {
  const { data, error } = await supabase
    .from("announcements")
    .insert(announcementToDb(announcementData))
    .select()
    .single();
  if (error) throw error;
  return dbToAnnouncement(data);
};

export const getAnnouncements = (
  currentUser: User,
  callback: (announcements: Announcement[]) => void,
): (() => void) => {
  const fetchAnnouncements = async () => {
    let query = supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentUser.role === "Associate") {
      query = query.eq("audience", "all");
    }

    const { data } = await query;
    callback((data ?? []).map(dbToAnnouncement));
  };

  fetchAnnouncements();

  const channel = supabase
    .channel("announcements")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "announcements" },
      () => fetchAnnouncements(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const updateAnnouncement = async (
  announcementId: string,
  updates: Partial<Omit<Announcement, "id">>,
): Promise<void> => {
  const { error } = await supabase
    .from("announcements")
    .update(announcementToDb(updates))
    .eq("id", announcementId);
  if (error) throw error;
};

export const deleteAnnouncement = async (
  announcementId: string,
): Promise<void> => {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);
  if (error) throw error;
};

// ── RESOURCE FUNCTIONS ────────────────────────────────────────────────────────

export const createResource = async (
  resourceData: Omit<Resource, "id">,
): Promise<Resource> => {
  const { data, error } = await supabase
    .from("resources")
    .insert(resourceToDb(resourceData))
    .select()
    .single();
  if (error) throw error;
  return dbToResource(data);
};

export const getResources = (
  callback: (resources: Resource[]) => void,
): (() => void) => {
  const fetchResources = async () => {
    const { data } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    callback((data ?? []).map(dbToResource));
  };

  fetchResources();

  const channel = supabase
    .channel("resources")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "resources" },
      () => fetchResources(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const updateResource = async (
  resourceId: string,
  updates: Partial<Resource>,
): Promise<void> => {
  const { error } = await supabase
    .from("resources")
    .update(resourceToDb(updates))
    .eq("id", resourceId);
  if (error) throw error;
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("id", resourceId);
  if (error) throw error;
};
