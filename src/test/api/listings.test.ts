import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  POST as createListing,
  GET as listListings,
} from "@/app/api/v1/listings/route";
import { DELETE as cancelListing } from "@/app/api/v1/listings/[id]/route";
import { POST as createArtwork } from "@/app/api/v1/artworks/route";
import { POST as registerAgent } from "@/app/api/v1/agents/register/route";
import { createAuthenticatedAgent } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";
import { db } from "@/db";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];
let seller: { token: string; userId: string };
let otherAgent: { token: string; userId: string };
let artworkId: string;
let artworkId2: string;
let listingId: string;
let cancelListingId: string;

beforeAll(async () => {
  seller = await createAuthenticatedAgent();
  userIds.push(seller.userId);
  await registerAgent(
    makeRequest("/api/v1/agents/register", {
      method: "POST",
      token: seller.token,
      body: { name: "ListingSeller" },
    }) as any
  );

  otherAgent = await createAuthenticatedAgent();
  userIds.push(otherAgent.userId);
  await registerAgent(
    makeRequest("/api/v1/agents/register", {
      method: "POST",
      token: otherAgent.token,
      body: { name: "ListingOther" },
    }) as any
  );

  // Create artworks for listing
  const art1 = await createArtwork(
    makeRequest("/api/v1/artworks", {
      method: "POST",
      token: seller.token,
      body: {
        title: "Listing Art 1",
        prompt: "Test",
        imageUrl: "https://example.com/listing1.png",
        mintAddress: "ListingMint1",
      },
    }) as any
  );
  artworkId = (await art1.json()).id;

  const art2 = await createArtwork(
    makeRequest("/api/v1/artworks", {
      method: "POST",
      token: seller.token,
      body: {
        title: "Listing Art 2",
        prompt: "Test",
        imageUrl: "https://example.com/listing2.png",
        mintAddress: "ListingMint2",
      },
    }) as any
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
        token: seller.token,
        body: { artworkId, priceSol: 1.5 },
      }) as any
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
        token: seller.token,
        body: { artworkId: artworkId2, priceSol: 5, listingType: "auction" },
      }) as any
    );

    const data = await res.json();
    cancelListingId = data.id;
    expect(data.listingType).toBe("auction");
  });

  test("rejects listing for unowned artwork", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        token: otherAgent.token,
        body: { artworkId, priceSol: 1 },
      }) as any
    );

    expect(res.status).toBe(404);
  });

  test("rejects missing fields", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        token: seller.token,
        body: { artworkId },
      }) as any
    );

    expect(res.status).toBe(400);
  });

  test("rejects unauthenticated request", async () => {
    const res = await createListing(
      makeRequest("/api/v1/listings", {
        method: "POST",
        body: { artworkId, priceSol: 1 },
      }) as any
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
      makeRequest("/api/v1/listings") as any
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
      }) as any
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
      }) as any
    );

    const data = await res.json();
    expect(data.length).toBeLessThanOrEqual(1);
  });
});

describe("Listing Cancellation — DELETE", () => {
  test("cancels own listing", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${cancelListingId}`, {
        method: "DELETE",
        token: seller.token,
      }) as any,
      makeParams({ id: cancelListingId })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("rejects cancelling unowned listing", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${listingId}`, {
        method: "DELETE",
        token: otherAgent.token,
      }) as any,
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(404);
  });

  test("rejects cancelling already-cancelled listing", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${cancelListingId}`, {
        method: "DELETE",
        token: seller.token,
      }) as any,
      makeParams({ id: cancelListingId })
    );

    expect(res.status).toBe(404);
  });

  test("rejects unauthenticated request", async () => {
    const res = await cancelListing(
      makeRequest(`/api/v1/listings/${listingId}`, {
        method: "DELETE",
      }) as any,
      makeParams({ id: listingId })
    );

    expect(res.status).toBe(401);
  });
});
