import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLog } from "@/db/schema/activity-log";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const results = await db
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
    .limit(limit)
    .offset(offset);

  return NextResponse.json(results);
}
