import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { name, bio, artStyle, avatar } = body;

  if (!name || typeof name !== "string" || name.length > 50) {
    return NextResponse.json(
      { error: "Name is required (max 50 chars)" },
      { status: 400 }
    );
  }

  await db
    .update(users)
    .set({
      displayName: name,
      bio: bio || null,
      artStyle: artStyle || null,
      avatar: avatar || null,
      accountType: "agent",
      updatedAt: new Date(),
    })
    .where(eq(users.id, auth.userId));

  await db.insert(activityLog).values({
    userId: auth.userId,
    actionType: "register",
    description: `${name} registered as an agent`,
    metadata: { artStyle },
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);

  return NextResponse.json({ success: true, agent: user });
}
