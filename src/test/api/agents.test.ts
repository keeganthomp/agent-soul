import { describe, test, expect, afterAll } from "bun:test";
import { POST as registerAgent } from "@/app/api/v1/agents/register/route";
import { GET as getMe } from "@/app/api/v1/agents/me/route";
import { PATCH as updateProfile } from "@/app/api/v1/agents/profile/route";
import { createAuthenticatedAgent } from "../helpers/auth";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest } from "../helpers/request";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { activityLog } from "@/db/schema/activity-log";
import { eq, and } from "drizzle-orm";

const userIds: string[] = [];

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

describe("Agent Registration", () => {
  test("registers with valid name", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: { name: "TestAgent" },
      }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.agent.displayName).toBe("TestAgent");
  });

  test("registers with all fields", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: {
          name: "FullAgent",
          bio: "A test bio",
          artStyle: "pixel-art",
          avatar: "https://example.com/avatar.png",
        },
      }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.agent.displayName).toBe("FullAgent");
    expect(data.agent.bio).toBe("A test bio");
    expect(data.agent.artStyle).toBe("pixel-art");
    expect(data.agent.avatar).toBe("https://example.com/avatar.png");
  });

  test("rejects missing name", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: {},
      }) as any
    );

    expect(res.status).toBe(400);
  });

  test("rejects name > 50 chars", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: { name: "A".repeat(51) },
      }) as any
    );

    expect(res.status).toBe(400);
  });

  test("rejects unauthenticated request", async () => {
    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        body: { name: "NoAuth" },
      }) as any
    );

    expect(res.status).toBe(401);
  });

  test("sets accountType to agent", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: { name: "TypeTest" },
      }) as any
    );

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, agent.userId))
      .limit(1);

    expect(user.accountType).toBe("agent");
  });

  test("logs activity entry", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: { name: "ActivityTest" },
      }) as any
    );

    const [entry] = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, agent.userId),
          eq(activityLog.actionType, "register")
        )
      )
      .limit(1);

    expect(entry).toBeDefined();
    expect(entry.actionType).toBe("register");
  });
});

describe("Agent Profile — GET /me", () => {
  test("returns profile after registration", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: { name: "MeTest" },
      }) as any
    );

    const res = await getMe(
      makeRequest("/api/v1/agents/me", { token: agent.token }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("MeTest");
    expect(data.walletAddress).toBe(agent.walletAddress);
  });

  test("rejects unauthenticated request", async () => {
    const res = await getMe(
      makeRequest("/api/v1/agents/me") as any
    );

    expect(res.status).toBe(401);
  });
});

describe("Agent Profile — PATCH", () => {
  test("updates profile fields", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        token: agent.token,
        body: { name: "PatchTest" },
      }) as any
    );

    const res = await updateProfile(
      makeRequest("/api/v1/agents/profile", {
        method: "PATCH",
        token: agent.token,
        body: { bio: "Updated bio", artStyle: "abstract" },
      }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bio).toBe("Updated bio");
    expect(data.artStyle).toBe("abstract");
    expect(data.displayName).toBe("PatchTest");
  });

  test("rejects unauthenticated request", async () => {
    const res = await updateProfile(
      makeRequest("/api/v1/agents/profile", {
        method: "PATCH",
        body: { bio: "No auth" },
      }) as any
    );

    expect(res.status).toBe(401);
  });
});
