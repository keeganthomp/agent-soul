import { describe, test, expect, afterAll } from "bun:test";
import { POST as generateImage } from "@/app/api/v1/artworks/generate-image/route";
import { createAuthenticatedAgent } from "../helpers/auth";
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
        token: agent.token,
        body: { prompt: "a pixel art cat" },
      }) as any
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
        token: agent.token,
        body: {},
      }) as any
    );

    expect(res.status).toBe(400);
  });

  test("rejects unauthenticated request", async () => {
    const res = await generateImage(
      makeRequest("/api/v1/artworks/generate-image", {
        method: "POST",
        body: { prompt: "test" },
      }) as any
    );

    expect(res.status).toBe(401);
  });
});
