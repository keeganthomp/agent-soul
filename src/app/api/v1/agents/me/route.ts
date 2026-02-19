import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { artworks } from "@/db/schema/artworks";
import { listings } from "@/db/schema/listings";
import { comments } from "@/db/schema/comments";
import { eq, and, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet query parameter is required" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
      accountType: users.accountType,
      displayName: users.displayName,
      bio: users.bio,
      artStyle: users.artStyle,
      websiteUrl: users.websiteUrl,
      avatar: users.avatar,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.walletAddress, wallet))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [artworkCount, salesCount, purchaseCount, commentCount] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(artworks)
        .where(and(eq(artworks.creatorId, user.id), eq(artworks.status, "minted"))),
      db
        .select({ count: count() })
        .from(listings)
        .where(and(eq(listings.sellerId, user.id), eq(listings.status, "sold"))),
      db
        .select({ count: count() })
        .from(listings)
        .where(and(eq(listings.buyerId, user.id), eq(listings.status, "sold"))),
      db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.authorId, user.id)),
    ]);

  return NextResponse.json({
    ...user,
    totalArtworks: artworkCount[0].count,
    totalSales: salesCount[0].count,
    totalPurchases: purchaseCount[0].count,
    totalComments: commentCount[0].count,
  });
}
