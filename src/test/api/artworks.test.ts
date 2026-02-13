import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  POST as createArtwork,
  GET as listArtworks,
} from "@/app/api/v1/artworks/route";
import { GET as getArtwork } from "@/app/api/v1/artworks/[id]/route";
import { POST as registerAgent } from "@/app/api/v1/agents/register/route";
import { createAuthenticatedAgent } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];
let agent: { token: string; userId: string; walletAddress: string };
let mintedArtworkId: string;

beforeAll(async () => {
  agent = await createAuthenticatedAgent();
  userIds.push(agent.userId);
  await registerAgent(
    makeRequest("/api/v1/agents/register", {
      method: "POST",
      token: agent.token,
      body: { name: "ArtworkTestAgent" },
    }) as any
  );
});

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Artwork Creation", () => {
  test("creates artwork with all required fields", async () => {
    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        token: agent.token,
        body: {
          title: "Test Art",
          prompt: "A beautiful sunset",
          imageUrl: "https://example.com/art.png",
          mintAddress: "FakeMint123abc",
        },
      }) as any
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe("Test Art");
    expect(data.creatorId).toBe(agent.userId);
    expect(data.ownerId).toBe(agent.userId);
    mintedArtworkId = data.id;
  });

  test("sets status to 'minted' when mintAddress provided", async () => {
    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        token: agent.token,
        body: {
          title: "Minted Art",
          prompt: "Test",
          imageUrl: "https://example.com/minted.png",
          mintAddress: "Mint123",
        },
      }) as any
    );

    const data = await res.json();
    expect(data.status).toBe("minted");
  });

  test("sets status to 'pending' without mintAddress", async () => {
    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        token: agent.token,
        body: {
          title: "Pending Art",
          prompt: "Test",
          imageUrl: "https://example.com/pending.png",
        },
      }) as any
    );

    const data = await res.json();
    expect(data.status).toBe("pending");
  });

  test("rejects missing required fields", async () => {
    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        token: agent.token,
        body: { title: "No Image" },
      }) as any
    );

    expect(res.status).toBe(400);
  });

  test("rejects unauthenticated request", async () => {
    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        body: {
          title: "No Auth",
          prompt: "Test",
          imageUrl: "https://example.com/noauth.png",
        },
      }) as any
    );

    expect(res.status).toBe(401);
  });

  test("increments user totalArtworks", async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, agent.userId))
      .limit(1);

    expect(user.totalArtworks).toBeGreaterThanOrEqual(3);
  });

  test("logs activity entry", async () => {
    const [entry] = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, agent.userId),
          eq(activityLog.actionType, "create_art")
        )
      )
      .limit(1);

    expect(entry).toBeDefined();
    expect(entry.actionType).toBe("create_art");
  });
});

describe("Artwork Listing — GET", () => {
  test("returns only minted artworks (public, no auth)", async () => {
    const res = await listArtworks(
      makeRequest("/api/v1/artworks") as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    for (const art of data) {
      expect(art.status).toBe("minted");
    }
  });

  test("filters by creatorId", async () => {
    const res = await listArtworks(
      makeRequest("/api/v1/artworks", {
        searchParams: { creatorId: agent.userId },
      }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    for (const art of data) {
      expect(art.creatorId).toBe(agent.userId);
    }
  });

  test("respects limit and offset", async () => {
    const res = await listArtworks(
      makeRequest("/api/v1/artworks", {
        searchParams: { limit: "1", offset: "0" },
      }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeLessThanOrEqual(1);
  });
});

describe("Artwork Detail — GET /[id]", () => {
  test("returns artwork with creator info", async () => {
    const res = await getArtwork(
      makeRequest(`/api/v1/artworks/${mintedArtworkId}`) as any,
      makeParams({ id: mintedArtworkId })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(mintedArtworkId);
    expect(data.creatorName).toBeDefined();
  });

  test("returns 404 for nonexistent artwork", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await getArtwork(
      makeRequest(`/api/v1/artworks/${fakeId}`) as any,
      makeParams({ id: fakeId })
    );

    expect(res.status).toBe(404);
  });
});
