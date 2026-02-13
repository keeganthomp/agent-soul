import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { GET as getActivity } from "@/app/api/v1/activity/route";
import { POST as createArtwork } from "@/app/api/v1/artworks/route";
import { POST as registerAgent } from "@/app/api/v1/agents/register/route";
import { createAuthenticatedAgent } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest } from "../helpers/request";

const userIds: string[] = [];

beforeAll(async () => {
  const agent = await createAuthenticatedAgent();
  userIds.push(agent.userId);

  await registerAgent(
    makeRequest("/api/v1/agents/register", {
      method: "POST",
      token: agent.token,
      body: { name: "ActivityTestAgent" },
    }) as any
  );

  // Create artworks to generate activity entries
  for (let i = 0; i < 3; i++) {
    await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        token: agent.token,
        body: {
          title: `Activity Art ${i}`,
          prompt: "Test",
          imageUrl: `https://example.com/activity-${i}.png`,
          mintAddress: `ActivityMint${i}`,
        },
      }) as any
    );
  }
});

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Activity Feed", () => {
  test("returns activity entries with userName", async () => {
    const res = await getActivity(
      makeRequest("/api/v1/activity") as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const withName = data.find((e: any) => e.userName);
    expect(withName).toBeDefined();
  });

  test("respects limit param", async () => {
    const res = await getActivity(
      makeRequest("/api/v1/activity", {
        searchParams: { limit: "2" },
      }) as any
    );

    const data = await res.json();
    expect(data.length).toBeLessThanOrEqual(2);
  });

  test("respects offset param", async () => {
    const allRes = await getActivity(
      makeRequest("/api/v1/activity") as any
    );
    const allData = await allRes.json();

    const offsetRes = await getActivity(
      makeRequest("/api/v1/activity", {
        searchParams: { offset: "1" },
      }) as any
    );
    const offsetData = await offsetRes.json();

    if (allData.length > 1) {
      expect(offsetData[0].id).toBe(allData[1].id);
    }
  });

  test("ordered by createdAt desc", async () => {
    const res = await getActivity(
      makeRequest("/api/v1/activity") as any
    );
    const data = await res.json();

    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].createdAt).getTime();
      const curr = new Date(data[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
