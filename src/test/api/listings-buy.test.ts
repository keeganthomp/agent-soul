import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { POST as buyListing } from "@/app/api/v1/listings/[id]/buy/route";
import { POST as createListing } from "@/app/api/v1/listings/route";
import { POST as createArtwork } from "@/app/api/v1/artworks/route";
import { createAuthenticatedAgent, createUnregisteredUser } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { artworks } from "@/db/schema/artworks";
import { listings } from "@/db/schema/listings";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];
let seller: { userId: string; walletAddress: string };
let buyer: { userId: string; walletAddress: string };
let artworkId: string;
let listingId: string;

beforeAll(async () => {
  seller = await createAuthenticatedAgent();
  userIds.push(seller.userId);

  buyer = await createAuthenticatedAgent();
  userIds.push(buyer.userId);

  // Create artwork and listing
  const artRes = await createArtwork(
    makeRequest("/api/v1/artworks", {
      method: "POST",
      walletAddress: seller.walletAddress,
      body: {
        title: "Buy Test Art",
        prompt: "Test",
        imageUrl: "https://example.com/buy-art.png",
      },
    })
  );
  artworkId = (await artRes.json()).id;

  const listRes = await createListing(
    makeRequest("/api/v1/listings", {
      method: "POST",
      walletAddress: seller.walletAddress,
      body: { artworkId, priceUsdc: 2.5 },
    })
  );
  listingId = (await listRes.json()).id;
});

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Purchase Flow", () => {
  test("buys active listing", async () => {
    const res = await buyListing(
      makeRequest(`/api/v1/listings/${listingId}/buy`, {
        method: "POST",
        walletAddress: buyer.walletAddress,
        body: { txSignature: "fakeTxSig123" },
      }),
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.txSignature).toBe("fakeTxSig123");
  });

  test("listing status is 'sold' after purchase", async () => {
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    expect(listing.status).toBe("sold");
    expect(listing.buyerId).toBe(buyer.userId);
  });

  test("artwork ownership transferred to buyer", async () => {
    const [artwork] = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, artworkId))
      .limit(1);

    expect(artwork.ownerId).toBe(buyer.userId);
  });

  test("buyer totalPurchases incremented", async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, buyer.userId))
      .limit(1);

    expect(user.totalPurchases).toBeGreaterThanOrEqual(1);
  });

  test("seller totalSales incremented", async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, seller.userId))
      .limit(1);

    expect(user.totalSales).toBeGreaterThanOrEqual(1);
  });

  test("logs activity entry", async () => {
    const [entry] = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, buyer.userId),
          eq(activityLog.actionType, "buy_artwork")
        )
      )
      .limit(1);

    expect(entry).toBeDefined();
  });
});

describe("Purchase Validation", () => {
  test("rejects missing txSignature", async () => {
    const art2 = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: seller.walletAddress,
        body: {
          title: "Buy Error Art",
          prompt: "Test",
          imageUrl: "https://example.com/buy-err.png",
        },
      })
    );
    const art2Id = (await art2.json()).id;

    const list2 = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        walletAddress: seller.walletAddress,
        body: { artworkId: art2Id, priceUsdc: 1 },
      })
    );
    const list2Id = (await list2.json()).id;

    const res = await buyListing(
      makeRequest(`/api/v1/listings/${list2Id}/buy`, {
        method: "POST",
        walletAddress: buyer.walletAddress,
        body: {},
      }),
      makeParams({ id: list2Id })
    );

    expect(res.status).toBe(400);
  });

  test("rejects nonexistent listing", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await buyListing(
      makeRequest(`/api/v1/listings/${fakeId}/buy`, {
        method: "POST",
        walletAddress: buyer.walletAddress,
        body: { txSignature: "fakeTx" },
      }),
      makeParams({ id: fakeId })
    );

    expect(res.status).toBe(404);
  });

  test("rejects already-sold listing", async () => {
    const res = await buyListing(
      makeRequest(`/api/v1/listings/${listingId}/buy`, {
        method: "POST",
        walletAddress: buyer.walletAddress,
        body: { txSignature: "fakeTx2" },
      }),
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(404);
  });

  test("rejects unregistered user (403)", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await buyListing(
      makeRequest(`/api/v1/listings/${listingId}/buy`, {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { txSignature: "fakeTx3" },
      }),
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(403);
  });

  test("rejects unauthenticated request", async () => {
    const res = await buyListing(
      makeRequest(`/api/v1/listings/${listingId}/buy`, {
        method: "POST",
        body: { txSignature: "fakeTx4" },
      }),
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(401);
  });
});
