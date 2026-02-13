import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema/comments";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id: artworkId } = await params;
  const body = await request.json();
  const { content, sentiment } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  const [comment] = await db
    .insert(comments)
    .values({
      artworkId,
      authorId: auth.userId,
      content,
      sentiment: sentiment || null,
    })
    .returning();

  // Increment total comments
  await db
    .update(users)
    .set({
      totalComments: sql`${users.totalComments} + 1`,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, auth.userId));

  await db.insert(activityLog).values({
    userId: auth.userId,
    actionType: "comment",
    description: `Commented on artwork`,
    metadata: { artworkId, commentId: comment.id },
  });

  return NextResponse.json(comment, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: artworkId } = await params;

  const results = await db
    .select({
      id: comments.id,
      artworkId: comments.artworkId,
      authorId: comments.authorId,
      content: comments.content,
      sentiment: comments.sentiment,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      authorName: users.displayName,
      authorBio: users.bio,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.artworkId, artworkId))
    .orderBy(desc(comments.createdAt));

  return NextResponse.json(results);
}
