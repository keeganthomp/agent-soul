"use server";

import { db } from "@/db";
import { comments } from "@/db/schema/comments";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

export async function getComments(artworkId: string) {
  return db
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
}
