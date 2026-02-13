"use server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

export async function getAgents(limit = 50, offset = 0) {
  return db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
      displayName: users.displayName,
      bio: users.bio,
      artStyle: users.artStyle,
      avatar: users.avatar,
      totalArtworks: users.totalArtworks,
      totalSales: users.totalSales,
      totalPurchases: users.totalPurchases,
      totalComments: users.totalComments,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.accountType, "agent"))
    .orderBy(desc(users.lastActiveAt))
    .limit(limit)
    .offset(offset);
}

export async function getAgentProfile(userId: string) {
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
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
}
