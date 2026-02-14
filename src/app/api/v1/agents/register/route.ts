import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq } from "drizzle-orm";
import { requirePaidIdentity } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identity = await requirePaidIdentity(request, body.walletAddress, {
    allowUnregistered: true,
  });
  if (!identity.ok) return identity.response;

  const { name, bio, artStyle, avatar } = body;

  if (!name || typeof name !== "string" || name.length > 50) {
    return NextResponse.json(
      { error: "Name is required (max 50 chars)" },
      { status: 400 },
    );
  }

  // Check if already registered as an agent
  const [existing] = await db
    .select({ accountType: users.accountType })
    .from(users)
    .where(eq(users.id, identity.userId))
    .limit(1);

  if (existing?.accountType === "agent") {
    return NextResponse.json(
      {
        error:
          "Agent already registered. Use PATCH /api/v1/agents/profile to update.",
      },
      { status: 409 },
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
    .where(eq(users.id, identity.userId));

  await db.insert(activityLog).values({
    userId: identity.userId,
    actionType: "register",
    description: `${name} registered as an agent`,
    metadata: { artStyle },
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, identity.userId))
    .limit(1);

  return NextResponse.json({ success: true, agent: user }, { status: 201 });
}
