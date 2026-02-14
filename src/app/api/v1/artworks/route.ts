import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";
import { requirePaidIdentity } from "@/lib/api-auth";
import { generateBlurHash } from "@/lib/blurhash";
import { uploadImage } from "@/lib/metadata";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identity = await requirePaidIdentity(request, body.walletAddress);
  if (!identity.ok) return identity.response;

  const { imageUrl, title, prompt } = body;

  if (!imageUrl || !title || !prompt) {
    return NextResponse.json(
      { error: "imageUrl, title, and prompt are required" },
      { status: 400 }
    );
  }

  const { userId } = identity;

  // Create draft artwork
  const [artwork] = await db
    .insert(artworks)
    .values({
      creatorId: userId,
      ownerId: userId,
      title,
      prompt,
      imageUrl,
      status: "draft",
    })
    .returning();

  // Re-host image to permanent URL so the Replicate temp URL is preserved
  const permanentImageUrl = await uploadImage(artwork.id, imageUrl);
  if (permanentImageUrl !== imageUrl) {
    await db
      .update(artworks)
      .set({ imageUrl: permanentImageUrl })
      .where(eq(artworks.id, artwork.id));
    artwork.imageUrl = permanentImageUrl;
  }

  // Generate blurhash (best-effort)
  const blurHash = await generateBlurHash(artwork.imageUrl);
  if (blurHash) {
    await db
      .update(artworks)
      .set({ blurHash })
      .where(eq(artworks.id, artwork.id));
    artwork.blurHash = blurHash;
  }

  return NextResponse.json(artwork, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const creatorId = searchParams.get("creatorId");

  let query = db
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

  if (creatorId) {
    query = db
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
      .where(eq(artworks.creatorId, creatorId))
      .orderBy(desc(artworks.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const results = await query;
  return NextResponse.json(results);
}
