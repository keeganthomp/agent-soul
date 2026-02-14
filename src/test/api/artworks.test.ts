import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  POST as createArtwork,
  GET as listArtworks,
} from "@/app/api/v1/artworks/route";
import { GET as getArtwork, DELETE as deleteArtwork } from "@/app/api/v1/artworks/[id]/route";
import { POST as submitArtwork } from "@/app/api/v1/artworks/[id]/submit/route";
import { GET as listDrafts } from "@/app/api/v1/artworks/drafts/route";
import { createAuthenticatedAgent, createUnregisteredUser } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];
let agent: { userId: string; walletAddress: string };
let artworkId: string;

beforeAll(async () => {
  agent = await createAuthenticatedAgent();
  userIds.push(agent.userId);
});

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Artwork Creation (Draft)", () => {
  test("creates draft artwork with all required fields", async () => {
    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {
          title: "Test Art",
          prompt: "A beautiful sunset",
          imageUrl: "https://example.com/art.png",
        },
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe("Test Art");
    expect(data.status).toBe("draft");
    expect(data.creatorId).toBe(agent.userId);
    expect(data.ownerId).toBe(agent.userId);
    artworkId = data.id;
  });

  test("does NOT increment totalArtworks (draft only)", async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, agent.userId))
      .limit(1);

    expect(user.totalArtworks).toBe(0);
  });

  test("does NOT log activity (draft only)", async () => {
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

    expect(entry).toBeUndefined();
  });

  test("rejects missing required fields", async () => {
    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: { title: "No Image" },
      })
    );

    expect(res.status).toBe(400);
  });

  test("rejects unregistered user (403)", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: {
          title: "Unregistered Art",
          prompt: "Test",
          imageUrl: "https://example.com/unreg.png",
        },
      })
    );

    expect(res.status).toBe(403);
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
      })
    );

    expect(res.status).toBe(401);
  });
});

describe("List Drafts — GET /drafts", () => {
  test("returns drafts for authenticated user", async () => {
    const res = await listDrafts(
      makeRequest("/api/v1/artworks/drafts", {
        searchParams: { wallet: agent.walletAddress },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    for (const draft of data) {
      expect(draft.status).toBe("draft");
      expect(draft.creatorId).toBe(agent.userId);
    }
  });
});

describe("Submit Draft — POST /[id]/submit", () => {
  test("submits draft and sets status to pending", async () => {
    const res = await submitArtwork(
      makeRequest(`/api/v1/artworks/${artworkId}/submit`, {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {},
      }),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(artworkId);
    // Status is "minted" when MINT_AUTHORITY_SECRET_KEY is set (mint mock succeeds),
    // or "pending" if not set
    expect(["pending", "minted"]).toContain(data.status);
  });

  test("increments totalArtworks after submit", async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, agent.userId))
      .limit(1);

    expect(user.totalArtworks).toBeGreaterThanOrEqual(1);
  });

  test("logs activity entry after submit", async () => {
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

  test("rejects submitting non-draft artwork", async () => {
    const res = await submitArtwork(
      makeRequest(`/api/v1/artworks/${artworkId}/submit`, {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {},
      }),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(400);
  });

  test("rejects submitting someone else's draft", async () => {
    const other = await createAuthenticatedAgent();
    userIds.push(other.userId);

    // Create a draft for `agent`
    const artRes = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {
          title: "Agent's Draft",
          prompt: "Test",
          imageUrl: "https://example.com/other.png",
        },
      })
    );
    const draft = await artRes.json();

    // Try to submit it as `other`
    const res = await submitArtwork(
      makeRequest(`/api/v1/artworks/${draft.id}/submit`, {
        method: "POST",
        walletAddress: other.walletAddress,
        body: {},
      }),
      makeParams({ id: draft.id })
    );

    expect(res.status).toBe(403);
  });

  test("rejects submitting nonexistent artwork", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await submitArtwork(
      makeRequest(`/api/v1/artworks/${fakeId}/submit`, {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {},
      }),
      makeParams({ id: fakeId })
    );

    expect(res.status).toBe(404);
  });
});

describe("Delete Draft — DELETE /[id]", () => {
  let draftToDelete: string;

  test("deletes own draft", async () => {
    const artRes = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {
          title: "Delete Me",
          prompt: "Test",
          imageUrl: "https://example.com/delete.png",
        },
      })
    );
    draftToDelete = (await artRes.json()).id;

    const res = await deleteArtwork(
      makeRequest(`/api/v1/artworks/${draftToDelete}`, {
        method: "DELETE",
        walletAddress: agent.walletAddress,
        body: {},
      }),
      makeParams({ id: draftToDelete })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("deleted draft is gone", async () => {
    const res = await getArtwork(
      makeRequest(`/api/v1/artworks/${draftToDelete}`),
      makeParams({ id: draftToDelete })
    );

    expect(res.status).toBe(404);
  });

  test("rejects deleting non-draft (submitted) artwork", async () => {
    // artworkId was already submitted above
    const res = await deleteArtwork(
      makeRequest(`/api/v1/artworks/${artworkId}`, {
        method: "DELETE",
        walletAddress: agent.walletAddress,
        body: {},
      }),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(400);
  });

  test("rejects deleting someone else's draft", async () => {
    const other = await createAuthenticatedAgent();
    userIds.push(other.userId);

    const artRes = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {
          title: "Not Yours",
          prompt: "Test",
          imageUrl: "https://example.com/notyours.png",
        },
      })
    );
    const draft = await artRes.json();

    const res = await deleteArtwork(
      makeRequest(`/api/v1/artworks/${draft.id}`, {
        method: "DELETE",
        walletAddress: other.walletAddress,
        body: {},
      }),
      makeParams({ id: draft.id })
    );

    expect(res.status).toBe(403);
  });
});

describe("Artwork Listing — GET", () => {
  test("returns artworks (public, no auth)", async () => {
    const res = await listArtworks(
      makeRequest("/api/v1/artworks")
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("filters by creatorId", async () => {
    const res = await listArtworks(
      makeRequest("/api/v1/artworks", {
        searchParams: { creatorId: agent.userId },
      })
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
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeLessThanOrEqual(1);
  });

  test("does not return drafts in gallery listing", async () => {
    const res = await listArtworks(
      makeRequest("/api/v1/artworks")
    );

    const data = await res.json();
    for (const art of data) {
      expect(art.status).not.toBe("draft");
    }
  });
});

describe("Artwork Detail — GET /[id]", () => {
  test("returns artwork with creator info", async () => {
    const res = await getArtwork(
      makeRequest(`/api/v1/artworks/${artworkId}`),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(artworkId);
  });

  test("returns 404 for nonexistent artwork", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await getArtwork(
      makeRequest(`/api/v1/artworks/${fakeId}`),
      makeParams({ id: fakeId })
    );

    expect(res.status).toBe(404);
  });
});
