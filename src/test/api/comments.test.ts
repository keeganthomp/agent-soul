import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  POST as createComment,
  GET as listComments,
} from "@/app/api/v1/artworks/[id]/comments/route";
import { POST as createArtwork } from "@/app/api/v1/artworks/route";
import { POST as registerAgent } from "@/app/api/v1/agents/register/route";
import { createAuthenticatedAgent } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];
let agent1: { token: string; userId: string };
let agent2: { token: string; userId: string };
let artworkId: string;

beforeAll(async () => {
  agent1 = await createAuthenticatedAgent();
  userIds.push(agent1.userId);
  await registerAgent(
    makeRequest("/api/v1/agents/register", {
      method: "POST",
      token: agent1.token,
      body: { name: "CommentAgent1" },
    }) as any
  );

  agent2 = await createAuthenticatedAgent();
  userIds.push(agent2.userId);
  await registerAgent(
    makeRequest("/api/v1/agents/register", {
      method: "POST",
      token: agent2.token,
      body: { name: "CommentAgent2" },
    }) as any
  );

  // Create artwork to comment on
  const artRes = await createArtwork(
    makeRequest("/api/v1/artworks", {
      method: "POST",
      token: agent1.token,
      body: {
        title: "Comment Test Art",
        prompt: "Test",
        imageUrl: "https://example.com/comment-art.png",
        mintAddress: "CommentMint123",
      },
    }) as any
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
        token: agent1.token,
        body: { content: "Great artwork!" },
      }) as any,
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
        token: agent1.token,
        body: { content: "Love it!", sentiment: "0.95" },
      }) as any,
      makeParams({ id: artworkId })
    );

    const data = await res.json();
    expect(data.sentiment).toBe("0.95");
  });

  test("rejects missing content", async () => {
    const res = await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        token: agent1.token,
        body: {},
      }) as any,
      makeParams({ id: artworkId })
    );

    expect(res.status).toBe(400);
  });

  test("rejects unauthenticated request", async () => {
    const res = await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        body: { content: "No auth" },
      }) as any,
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

    // We created 2 comments above
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
      makeRequest(`/api/v1/artworks/${artworkId}/comments`) as any,
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
        token: agent1.token,
        body: {
          title: "No Comments Art",
          prompt: "Test",
          imageUrl: "https://example.com/nocomments.png",
          mintAddress: "NoCommentMint",
        },
      }) as any
    );
    const artData = await artRes.json();

    const res = await listComments(
      makeRequest(`/api/v1/artworks/${artData.id}/comments`) as any,
      makeParams({ id: artData.id })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  test("shows comments from multiple authors", async () => {
    // Agent2 adds a comment
    await createComment(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`, {
        method: "POST",
        token: agent2.token,
        body: { content: "Nice work from agent2!" },
      }) as any,
      makeParams({ id: artworkId })
    );

    const res = await listComments(
      makeRequest(`/api/v1/artworks/${artworkId}/comments`) as any,
      makeParams({ id: artworkId })
    );

    const data = await res.json();
    const authorIds = new Set(data.map((c: any) => c.authorId));
    expect(authorIds.size).toBeGreaterThanOrEqual(2);
  });
});
