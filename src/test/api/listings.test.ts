import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  POST as createListing,
  GET as listListings,
} from "@/app/api/v1/listings/route";
import { POST as cancelListing } from "@/app/api/v1/listings/[id]/cancel/route";
import { POST as createArtwork } from "@/app/api/v1/artworks/route";
import { createAuthenticatedAgent, createUnregisteredUser } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";
import { db } from "@/db";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];
let seller: { userId: string; walletAddress: string };
let otherAgent: { userId: string; walletAddress: string };
let artworkId: string;
let artworkId2: string;
let listingId: string;
let cancelListingId: string;

beforeAll(async () => {
  seller = await createAuthenticatedAgent();
  userIds.push(seller.userId);

  otherAgent = await createAuthenticatedAgent();
  userIds.push(otherAgent.userId);

  // Create artworks for listing
  const art1 = await createArtwork(
    makeRequest("/api/v1/artworks", {
      method: "POST",
      walletAddress: seller.walletAddress,
      body: {
        title: "Listing Art 1",
        prompt: "Test",
        imageUrl: "https://example.com/listing1.png",
      },
    })
  );
  artworkId = (await art1.json()).id;

  const art2 = await createArtwork(
    makeRequest("/api/v1/artworks", {
      method: "POST",
      walletAddress: seller.walletAddress,
      body: {
        title: "Listing Art 2",
        prompt: "Test",
        imageUrl: "https://example.com/listing2.png",
      },
    })
  );
  artworkId2 = (await art2.json()).id;
});

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Listing Creation", () => {
  test("creates listing with status active", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        walletAddress: seller.walletAddress,
        body: { artworkId, priceSol: 1.5 },
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    listingId = data.id;
    expect(data.status).toBe("active");
    expect(parseFloat(data.priceSol)).toBe(1.5);
    expect(data.sellerId).toBe(seller.userId);
  });

  test("creates listing with auction type", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        walletAddress: seller.walletAddress,
        body: { artworkId: artworkId2, priceSol: 5, listingType: "auction" },
      })
    );

    const data = await res.json();
    cancelListingId = data.id;
    expect(data.listingType).toBe("auction");
  });

  test("rejects listing for unowned artwork", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        walletAddress: otherAgent.walletAddress,
        body: { artworkId, priceSol: 1 },
      })
    );

    expect(res.status).toBe(404);
  });

  test("rejects missing fields", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        walletAddress: seller.walletAddress,
        body: { artworkId },
      })
    );

    expect(res.status).toBe(400);
  });

  test("rejects unregistered user (403)", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { artworkId, priceSol: 1 },
      })
    );

    expect(res.status).toBe(403);
  });

  test("rejects unauthenticated request", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        body: { artworkId, priceSol: 1 },
      })
    );

    expect(res.status).toBe(401);
  });

  test("logs activity entry", async () => {
    const [entry] = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, seller.userId),
          eq(activityLog.actionType, "list_artwork")
        )
      )
      .limit(1);

    expect(entry).toBeDefined();
  });
});

describe("Listing Browsing — GET", () => {
  test("returns active listings", async () => {
    const res = await listListings(
      makeRequest("/api/v1/listings")
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    for (const listing of data) {
      expect(listing.status).toBe("active");
    }
  });

  test("filters by status", async () => {
    const res = await listListings(
      makeRequest("/api/v1/listings", {
        searchParams: { status: "sold" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    for (const listing of data) {
      expect(listing.status).toBe("sold");
    }
  });

  test("respects pagination", async () => {
    const res = await listListings(
      makeRequest("/api/v1/listings", {
        searchParams: { limit: "1", offset: "0" },
      })
    );

    const data = await res.json();
    expect(data.length).toBeLessThanOrEqual(1);
  });
});

describe("Listing Cancellation — POST /cancel", () => {
  test("cancels own listing", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${cancelListingId}/cancel`, {
        method: "POST",
        walletAddress: seller.walletAddress,
        body: {},
      }),
      makeParams({ id: cancelListingId })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("rejects cancelling unowned listing", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${listingId}/cancel`, {
        method: "POST",
        walletAddress: otherAgent.walletAddress,
        body: {},
      }),
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(404);
  });

  test("rejects cancelling already-cancelled listing", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${cancelListingId}/cancel`, {
        method: "POST",
        walletAddress: seller.walletAddress,
        body: {},
      }),
      makeParams({ id: cancelListingId })
    );

    expect(res.status).toBe(404);
  });

  test("rejects unauthenticated request", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${listingId}/cancel`, {
        method: "POST",
        body: {},
      }),
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(401);
  });
});
