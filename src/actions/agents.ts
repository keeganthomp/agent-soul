"use server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { artworks } from "@/db/schema/artworks";
import { listings } from "@/db/schema/listings";
import { comments } from "@/db/schema/comments";
import { eq, and, desc, count, sql } from "drizzle-orm";

export async function getAgents(limit = 50, offset = 0) {
  const agents = await db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
      displayName: users.displayName,
      bio: users.bio,
      artStyle: users.artStyle,
      avatar: users.avatar,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.accountType, "agent"))
    .orderBy(desc(users.lastActiveAt))
    .limit(limit)
    .offset(offset);

  if (agents.length === 0) return [];

  const ids = agents.map((a) => a.id);

  // Batch count queries for all agents at once
  const [artworkCounts, salesCounts, purchaseCounts, commentCounts] =
    await Promise.all([
      db
        .select({ userId: artworks.creatorId, count: count() })
        .from(artworks)
        .where(and(sql`${artworks.creatorId} IN ${ids}`, eq(artworks.status, "minted")))
        .groupBy(artworks.creatorId),
      db
        .select({ userId: listings.sellerId, count: count() })
        .from(listings)
        .where(and(sql`${listings.sellerId} IN ${ids}`, eq(listings.status, "sold")))
        .groupBy(listings.sellerId),
      db
        .select({ userId: listings.buyerId, count: count() })
        .from(listings)
        .where(and(sql`${listings.buyerId} IN ${ids}`, eq(listings.status, "sold")))
        .groupBy(listings.buyerId),
      db
        .select({ userId: comments.authorId, count: count() })
        .from(comments)
        .where(sql`${comments.authorId} IN ${ids}`)
        .groupBy(comments.authorId),
    ]);

  const artworkMap = new Map(artworkCounts.map((r) => [r.userId, r.count]));
  const salesMap = new Map(salesCounts.map((r) => [r.userId, r.count]));
  const purchaseMap = new Map(purchaseCounts.map((r) => [r.userId!, r.count]));
  const commentMap = new Map(commentCounts.map((r) => [r.userId, r.count]));

  return agents.map((agent) => ({
    ...agent,
    totalArtworks: artworkMap.get(agent.id) ?? 0,
    totalSales: salesMap.get(agent.id) ?? 0,
    totalPurchases: purchaseMap.get(agent.id) ?? 0,
    totalComments: commentMap.get(agent.id) ?? 0,
  }));
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
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const [artworkCount, salesCount, purchaseCount, commentCount] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(artworks)
        .where(and(eq(artworks.creatorId, userId), eq(artworks.status, "minted"))),
      db
        .select({ count: count() })
        .from(listings)
        .where(and(eq(listings.sellerId, userId), eq(listings.status, "sold"))),
      db
        .select({ count: count() })
        .from(listings)
        .where(and(eq(listings.buyerId, userId), eq(listings.status, "sold"))),
      db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.authorId, userId)),
    ]);

  return {
    ...user,
    totalArtworks: artworkCount[0].count,
    totalSales: salesCount[0].count,
    totalPurchases: purchaseCount[0].count,
    totalComments: commentCount[0].count,
  };
}
