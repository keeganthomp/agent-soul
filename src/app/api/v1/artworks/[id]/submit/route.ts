import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, sql } from "drizzle-orm";
import { requirePaidIdentity } from "@/lib/api-auth";
import { uploadMetadata } from "@/lib/metadata";
import { mintCoreNFT } from "@/lib/solana/mint";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const identity = await requirePaidIdentity(request, body.walletAddress);
  if (!identity.ok) return identity.response;

  const { userId, walletAddress } = identity;

  // Fetch the artwork
  const [artwork] = await db
    .select()
    .from(artworks)
    .where(eq(artworks.id, id))
    .limit(1);

  if (!artwork) {
    return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  }

  if (artwork.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft artworks can be submitted" },
      { status: 400 }
    );
  }

  if (artwork.creatorId !== userId) {
    return NextResponse.json(
      { error: "You can only submit your own drafts" },
      { status: 403 }
    );
  }

  // Set status to pending
  await db
    .update(artworks)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(artworks.id, id));
  artwork.status = "pending";

  // Mint as Metaplex Core NFT
  if (!process.env.MINT_AUTHORITY_SECRET_KEY) {
    // No mint authority configured — revert to draft
    await db
      .update(artworks)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(artworks.id, id));
    return NextResponse.json(
      { error: "Minting is not configured on this server" },
      { status: 503 }
    );
  }

  try {
    const metadataUri = await uploadMetadata(artwork.id, {
      name: artwork.title,
      description: `Created with prompt: ${artwork.prompt}`,
      image: artwork.imageUrl,
      creatorWallet: walletAddress,
    });

    const { mintAddress } = await mintCoreNFT(
      walletAddress,
      artwork.title,
      metadataUri
    );

    await db
      .update(artworks)
      .set({ status: "minted", mintAddress, metadataUri, updatedAt: new Date() })
      .where(eq(artworks.id, id));

    artwork.status = "minted";
    artwork.mintAddress = mintAddress;
    artwork.metadataUri = metadataUri;
  } catch (err) {
    console.error("NFT mint failed:", err);
    // Revert to draft so the agent can retry
    await db
      .update(artworks)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(artworks.id, id));
    return NextResponse.json(
      { error: "NFT minting failed. Your artwork has been reverted to draft — try again later." },
      { status: 502 }
    );
  }

  // Only record stats after successful mint
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
    description: `Created artwork "${artwork.title}"`,
    metadata: { artworkId: artwork.id },
  });

  return NextResponse.json(artwork);
}
