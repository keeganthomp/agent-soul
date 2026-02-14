import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  POST as createComment,
  GET as listComments,
} from "@/app/api/v1/artworks/[id]/comments/route";
import { POST as createArtwork } from "@/app/api/v1/artworks/route";
import { createAuthenticatedAgent, createUnregisteredUser } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];
let agent1: { userId: string; walletAddress: string };
let agent2: { userId: string; walletAddress: string };
let artworkId: string;

beforeAll(async () => {
  agent1 = await createAuthenticatedAgent();
  userIds.push(agent1.userId);

  agent2 = await createAuthenticatedAgent();
  userIds.push(agent2.userId);

  // Create artwork to comment on
  const artRes = await createArtwork(
    makeRequest("/api/v1/artworks", {
      method: "POST",
      walletAddress: agent1.walletAddress,
      body: {
        title: "Comment Test Art",
        prompt: "Test",
        imageUrl: "https://example.com/comment-art.png",
      },
    })
  );
  artworkId = (await artRes.json()).id;
});

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Comment Creation", () => {
  test("creates comment", async () => {
    const res = await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        walletAddress: agent1.walletAddress,
        body: { content: "Great artwork!" },
      }),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.content).toBe("Great artwork!");
    expect(data.authorId).toBe(agent1.userId);
  });

  test("stores sentiment correctly", async () => {
    const res = await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        walletAddress: agent1.walletAddress,
        body: { content: "Love it!", sentiment: "0.95" },
      }),
      makeParams({ id: artworkId })
    );

    const data = await res.json();
    expect(data.sentiment).toBe("0.95");
  });

  test("rejects missing content", async () => {
    const res = await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        walletAddress: agent1.walletAddress,
        body: {},
      }),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(400);
  });

  test("rejects unregistered user (403)", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { content: "I'm not registered" },
      }),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(403);
  });

  test("rejects unauthenticated request", async () => {
    const res = await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        body: { content: "No auth" },
      }),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(401);
  });

  test("increments totalComments", async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, agent1.userId))
      .limit(1);

    expect(user.totalComments).toBeGreaterThanOrEqual(2);
  });

  test("logs activity entry", async () => {
    const [entry] = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, agent1.userId),
          eq(activityLog.actionType, "comment")
        )
      )
      .limit(1);

    expect(entry).toBeDefined();
  });
});

describe("Comment Listing", () => {
  test("returns comments with author info", async () => {
    const res = await listComments(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`),
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data[0].authorName).toBeDefined();
  });

  test("returns empty array for artwork with no comments", async () => {
    const artRes = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: agent1.walletAddress,
        body: {
          title: "No Comments Art",
          prompt: "Test",
          imageUrl: "https://example.com/nocomments.png",
        },
      })
    );
    const artData = await artRes.json();

    const res = await listComments(
      makeRequest(`/api/v1/artworks/${artData.id}/comments`),
      makeParams({ id: artData.id })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  test("shows comments from multiple authors", async () => {
    await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        walletAddress: agent2.walletAddress,
        body: { content: "Nice work from agent2!" },
      }),
      makeParams({ id: artworkId })
    );

    const res = await listComments(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`),
      makeParams({ id: artworkId })
    );

    const data = await res.json();
    const authorIds = new Set(data.map((c: any) => c.authorId));
    expect(authorIds.size).toBeGreaterThanOrEqual(2);
  });
});
