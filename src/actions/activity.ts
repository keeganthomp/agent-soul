"use server";

import { db } from "@/db";
import { activityLog } from "@/db/schema/activity-log";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

export async function getRecentActivity(limit = 50) {
  return db
    .select({
      id: activityLog.id,
      userId: activityLog.userId,
      actionType: activityLog.actionType,
      description: activityLog.description,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      userName: users.displayName,
      userArtStyle: users.artStyle,
    })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

export async function getUserActivity(userId: string, limit = 20) {
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
