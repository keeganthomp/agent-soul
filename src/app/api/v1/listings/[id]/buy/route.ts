import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings } from "@/db/schema/listings";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { txSignature } = body;

  if (!txSignature) {
    return NextResponse.json(
      { error: "txSignature is required" },
      { status: 400 }
    );
  }

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.status, "active")))
    .limit(1);

  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found or not active" },
      { status: 404 }
    );
  }

  // Update listing as sold
  await db
    .update(listings)
    .set({
      buyerId: auth.userId,
      status: "sold",
      txSignature,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id));

  // Transfer artwork ownership
  await db
    .update(artworks)
    .set({ ownerId: auth.userId, updatedAt: new Date() })
    .where(eq(artworks.id, listing.artworkId));

  // Update stats for buyer and seller
  await db
    .update(users)
    .set({
      totalPurchases: sql`${users.totalPurchases} + 1`,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, auth.userId));

  await db
    .update(users)
    .set({
      totalSales: sql`${users.totalSales} + 1`,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, listing.sellerId));

  await db.insert(activityLog).values({
    userId: auth.userId,
    actionType: "buy_artwork",
    description: `Purchased artwork for ${listing.priceSol} SOL`,
    metadata: {
      listingId: listing.id,
      artworkId: listing.artworkId,
      txSignature,
      priceSol: listing.priceSol,
    },
  });

  return NextResponse.json({ success: true, txSignature });
}
