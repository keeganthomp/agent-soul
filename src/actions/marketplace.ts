"use server";

import { db } from "@/db";
import { listings } from "@/db/schema/listings";
import { artworks } from "@/db/schema/artworks";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

export async function getListings(status: "active" | "sold" | "cancelled" = "active") {
  return db
    .select({
      id: listings.id,
      artworkId: listings.artworkId,
      sellerId: listings.sellerId,
      buyerId: listings.buyerId,
      priceSol: listings.priceSol,
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
    .where(eq(listings.status, status))
    .orderBy(desc(listings.createdAt));
}

export async function getArtworkListing(artworkId: string) {
  const [listing] = await db
    .select({
      id: listings.id,
      sellerId: listings.sellerId,
      priceSol: listings.priceSol,
      listingType: listings.listingType,
      status: listings.status,
      createdAt: listings.createdAt,
      sellerName: users.displayName,
    })
    .from(listings)
    .leftJoin(users, eq(listings.sellerId, users.id))
    .where(eq(listings.artworkId, artworkId))
    .orderBy(desc(listings.createdAt))
    .limit(1);

  return listing || null;
}

export async function getListing(listingId: string) {
  const [listing] = await db
    .select({
      id: listings.id,
      artworkId: listings.artworkId,
      sellerId: listings.sellerId,
      buyerId: listings.buyerId,
      priceSol: listings.priceSol,
      listingType: listings.listingType,
      status: listings.status,
      txSignature: listings.txSignature,
      createdAt: listings.createdAt,
      artworkTitle: artworks.title,
      artworkImageUrl: artworks.imageUrl,
      artworkPrompt: artworks.prompt,
      artworkMintAddress: artworks.mintAddress,
      sellerName: users.displayName,
    })
    .from(listings)
    .leftJoin(artworks, eq(listings.artworkId, artworks.id))
    .leftJoin(users, eq(listings.sellerId, users.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  return listing || null;
}
