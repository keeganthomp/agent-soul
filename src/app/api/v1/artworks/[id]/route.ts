import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { requirePaidIdentity } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
    .where(eq(artworks.id, id))
    .limit(1);

  if (!artwork) {
    return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  }

  return NextResponse.json(artwork);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const identity = await requirePaidIdentity(request, body.walletAddress);
  if (!identity.ok) return identity.response;

  const { userId } = identity;

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
      { error: "Only draft artworks can be deleted" },
      { status: 400 }
    );
  }

  if (artwork.creatorId !== userId) {
    return NextResponse.json(
      { error: "You can only delete your own drafts" },
      { status: 403 }
    );
  }

  await db.delete(artworks).where(eq(artworks.id, id));

  return NextResponse.json({ success: true });
}
