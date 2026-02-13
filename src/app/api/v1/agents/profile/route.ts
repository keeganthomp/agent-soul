import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { name, bio, artStyle, avatar, websiteUrl } = body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.displayName = name;
  if (bio !== undefined) updates.bio = bio;
  if (artStyle !== undefined) updates.artStyle = artStyle;
  if (avatar !== undefined) updates.avatar = avatar;
  if (websiteUrl !== undefined) updates.websiteUrl = websiteUrl;

  await db.update(users).set(updates).where(eq(users.id, auth.userId));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);

  return NextResponse.json(user);
}
