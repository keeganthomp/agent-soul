import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { findOrCreateUserByWallet } from "@/lib/auth";
import { requirePayment } from "@/lib/x402";
import { generateBlurHash } from "@/lib/blurhash";
import { uploadImage, uploadMetadata } from "@/lib/metadata";
import { mintCoreNFT } from "@/lib/solana/mint";

export async function POST(request: NextRequest) {
  // 1. Require x402 payment (returns 402 if no valid payment)
  const paymentResponse = await requirePayment(request);
  if (paymentResponse) return paymentResponse;

  // 2. Parse body
  const body = await request.json();
  const { imageUrl, title, prompt, walletAddress } = body;

  if (!imageUrl || !title || !prompt) {
    return NextResponse.json(
      { error: "imageUrl, title, and prompt are required" },
      { status: 400 }
    );
  }

  // 3. Resolve creator identity: JWT first, then walletAddress fallback
  let userId: string;
  let ownerWallet: string;
  const auth = await requireAuth(request);
  if (!isErrorResponse(auth)) {
    userId = auth.userId;
    ownerWallet = auth.walletAddress;
  } else if (walletAddress && typeof walletAddress === "string") {
    userId = await findOrCreateUserByWallet(walletAddress);
    ownerWallet = walletAddress;
  } else {
    return NextResponse.json(
      { error: "Authorization header or walletAddress in body is required" },
      { status: 401 }
    );
  }

  // 4. Create artwork
  const [artwork] = await db
    .insert(artworks)
    .values({
      creatorId: userId,
      ownerId: userId,
      title,
      prompt,
      imageUrl,
    })
    .returning();

  // Increment total artworks
  await db
    .update(users)
    .set({
      totalArtworks: sql`${users.totalArtworks} + 1`,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await db.insert(activityLog).values({
    userId,
    actionType: "create_art",
    description: `Created artwork "${title}"`,
    metadata: { artworkId: artwork.id },
  });

  // Generate blurhash for the image (best-effort, ~<1s)
  const blurHash = await generateBlurHash(imageUrl);
  if (blurHash) {
    await db
      .update(artworks)
      .set({ blurHash })
      .where(eq(artworks.id, artwork.id));
    artwork.blurHash = blurHash;
  }

  // Mint as Metaplex Core NFT (best-effort — artwork is returned regardless)
  if (process.env.MINT_AUTHORITY_SECRET_KEY) {
    try {
      // Re-host image to permanent URL
      const permanentImageUrl = await uploadImage(artwork.id, imageUrl);
      if (permanentImageUrl !== imageUrl) {
        await db
          .update(artworks)
          .set({ imageUrl: permanentImageUrl })
          .where(eq(artworks.id, artwork.id));
        artwork.imageUrl = permanentImageUrl;
      }

      const metadataUri = await uploadMetadata(artwork.id, {
        name: title,
        description: `Created with prompt: ${prompt}`,
        image: permanentImageUrl,
        creatorWallet: ownerWallet,
      });

      const { mintAddress } = await mintCoreNFT(ownerWallet, title, metadataUri);

      await db
        .update(artworks)
        .set({ status: "minted", mintAddress, metadataUri })
        .where(eq(artworks.id, artwork.id));

      artwork.status = "minted";
      artwork.mintAddress = mintAddress;
      artwork.metadataUri = metadataUri;
    } catch (err) {
      console.error("NFT mint failed:", err);
      await db
        .update(artworks)
        .set({ status: "failed" })
        .where(eq(artworks.id, artwork.id));
      artwork.status = "failed";
    }
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
