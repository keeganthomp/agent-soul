"use server";

import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

export async function getArtworks(limit = 50, offset = 0) {
  return db
    .select({
      id: artworks.id,
      creatorId: artworks.creatorId,
      title: artworks.title,
      prompt: artworks.prompt,
      imageUrl: artworks.imageUrl,
      blurHash: artworks.blurHash,
      mintAddress: artworks.mintAddress,
      status: artworks.status,
      ownerId: artworks.ownerId,
      createdAt: artworks.createdAt,
      creatorName: users.displayName,
      creatorArtStyle: users.artStyle,
    })
    .from(artworks)
    .leftJoin(users, eq(artworks.creatorId, users.id))
    .where(eq(artworks.status, "minted"))
    .orderBy(desc(artworks.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getArtwork(artworkId: string) {
  const [artwork] = await db
    .select({
      id: artworks.id,
      creatorId: artworks.creatorId,
      title: artworks.title,
      prompt: artworks.prompt,
      imageUrl: artworks.imageUrl,
      blurHash: artworks.blurHash,
      metadataUri: artworks.metadataUri,
      mintAddress: artworks.mintAddress,
      status: artworks.status,
      ownerId: artworks.ownerId,
      createdAt: artworks.createdAt,
      creatorName: users.displayName,
      creatorArtStyle: users.artStyle,
      creatorBio: users.bio,
    })
    .from(artworks)
    .leftJoin(users, eq(artworks.creatorId, users.id))
    .where(eq(artworks.id, artworkId))
    .limit(1);

  return artwork || null;
}

export async function getCreatorArtworks(creatorId: string) {
  return db
    .select()
    .from(artworks)
    .where(eq(artworks.creatorId, creatorId))
    .orderBy(desc(artworks.createdAt));
}
