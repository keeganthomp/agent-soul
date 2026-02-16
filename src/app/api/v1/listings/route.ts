import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings } from "@/db/schema/listings";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, desc, and } from "drizzle-orm";
import { requirePaidIdentity } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identity = await requirePaidIdentity(request, body.walletAddress);
  if (!identity.ok) return identity.response;

  const { artworkId, priceUsdc, listingType } = body;

  if (!artworkId || !priceUsdc || priceUsdc <= 0) {
    return NextResponse.json(
      { error: "artworkId and priceUsdc are required" },
      { status: 400 }
    );
  }

  // Verify the user owns this artwork
  const [artwork] = await db
    .select()
    .from(artworks)
    .where(
      and(eq(artworks.id, artworkId), eq(artworks.ownerId, identity.userId))
    )
    .limit(1);

  if (!artwork) {
    return NextResponse.json(
      { error: "Artwork not found or not owned by you" },
      { status: 404 }
    );
  }

  const [listing] = await db
    .insert(listings)
    .values({
      artworkId,
      sellerId: identity.userId,
      priceUsdc: priceUsdc.toString(),
      listingType: listingType || "fixed",
    })
    .returning();

  await db.insert(activityLog).values({
    userId: identity.userId,
    actionType: "list_artwork",
    description: `Listed "${artwork.title}" for ${priceUsdc} USDC`,
    metadata: { artworkId, listingId: listing.id, priceUsdc },
  });

  return NextResponse.json(listing, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const results = await db
    .select({
      id: listings.id,
      artworkId: listings.artworkId,
      sellerId: listings.sellerId,
      buyerId: listings.buyerId,
      priceUsdc: listings.priceUsdc,
      listingType: listings.listingType,
      status: listings.status,
      txSignature: listings.txSignature,
      createdAt: listings.createdAt,
      artworkTitle: artworks.title,
      artworkImageUrl: artworks.imageUrl,
      artworkMintAddress: artworks.mintAddress,
      sellerName: users.displayName,
    })
    .from(listings)
    .leftJoin(artworks, eq(listings.artworkId, artworks.id))
    .leftJoin(users, eq(listings.sellerId, users.id))
    .where(eq(listings.status, status as "active" | "sold" | "cancelled"))
    .orderBy(desc(listings.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(results);
}
