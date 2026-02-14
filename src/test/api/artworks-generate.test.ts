import { describe, test, expect, afterAll } from "bun:test";
import { POST as generateImage } from "@/app/api/v1/artworks/generate-image/route";
import { createAuthenticatedAgent, createUnregisteredUser } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest } from "../helpers/request";

const userIds: string[] = [];

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Image Generation (mocked Replicate)", () => {
  test("generates image with valid prompt", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await generateImage(
      makeRequest("/api/v1/artworks/generate-image", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: { prompt: "a pixel art cat" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.imageUrl).toBeDefined();
    expect(data.imageUrl).toContain("fake-replicate.test");
  });

  test("rejects missing prompt", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await generateImage(
      makeRequest("/api/v1/artworks/generate-image", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {},
      })
    );

    expect(res.status).toBe(400);
  });

  test("rejects unregistered user (403)", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await generateImage(
      makeRequest("/api/v1/artworks/generate-image", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { prompt: "test" },
      })
    );

    expect(res.status).toBe(403);
  });

  test("rejects unauthenticated request", async () => {
    const res = await generateImage(
      makeRequest("/api/v1/artworks/generate-image", {
        method: "POST",
        body: { prompt: "test" },
      })
    );

    expect(res.status).toBe(401);
  });
});
