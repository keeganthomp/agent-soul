import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

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
      totalArtworks: users.totalArtworks,
      totalSales: users.totalSales,
      totalPurchases: users.totalPurchases,
      totalComments: users.totalComments,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.walletAddress, wallet))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
