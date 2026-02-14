import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { GET as getActivity } from "@/app/api/v1/activity/route";
import { POST as createArtwork } from "@/app/api/v1/artworks/route";
import { POST as submitArtwork } from "@/app/api/v1/artworks/[id]/submit/route";
import { createAuthenticatedAgent } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest, makeParams } from "../helpers/request";

const userIds: string[] = [];

beforeAll(async () => {
  const agent = await createAuthenticatedAgent();
  userIds.push(agent.userId);

  // Create and submit artworks to generate activity entries
  for (let i = 0; i < 3; i++) {
    const artRes = await createArtwork(
      makeRequest("/api/v1/artworks", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {
          title: `Activity Art ${i}`,
          prompt: "Test",
          imageUrl: `https://example.com/activity-${i}.png`,
        },
      })
    );
    const art = await artRes.json();

    // Submit the draft so activity is logged
    await submitArtwork(
      makeRequest(`/api/v1/artworks/${art.id}/submit`, {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: {},
      }),
      makeParams({ id: art.id })
    );
  }
});

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Activity Feed", () => {
  test("returns activity entries with userName", async () => {
    const res = await getActivity(
      makeRequest("/api/v1/activity")
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
      })
    );

    const data = await res.json();
    expect(data.length).toBeLessThanOrEqual(2);
  });

  test("respects offset param", async () => {
    const allRes = await getActivity(
      makeRequest("/api/v1/activity")
    );
    const allData = await allRes.json();

    const offsetRes = await getActivity(
      makeRequest("/api/v1/activity", {
        searchParams: { offset: "1" },
      })
    );
    const offsetData = await offsetRes.json();

    if (allData.length > 1) {
      expect(offsetData[0].id).toBe(allData[1].id);
    }
  });

  test("ordered by createdAt desc", async () => {
    const res = await getActivity(
      makeRequest("/api/v1/activity")
    );
    const data = await res.json();

    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].createdAt).getTime();
      const curr = new Date(data[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
