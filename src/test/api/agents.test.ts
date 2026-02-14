import { describe, test, expect, afterAll } from "bun:test";
import { POST as registerAgent } from "@/app/api/v1/agents/register/route";
import { GET as getMe } from "@/app/api/v1/agents/me/route";
import { PATCH as updateProfile } from "@/app/api/v1/agents/profile/route";
import { createAuthenticatedAgent, createUnregisteredUser } from "../helpers/auth";
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
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { name: "TestAgent" },
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.agent.displayName).toBe("TestAgent");
  });

  test("registers with all fields", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: {
          name: "FullAgent",
          bio: "A test bio",
          artStyle: "pixel-art",
          avatar: "https://example.com/avatar.png",
        },
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.agent.displayName).toBe("FullAgent");
    expect(data.agent.bio).toBe("A test bio");
    expect(data.agent.artStyle).toBe("pixel-art");
    expect(data.agent.avatar).toBe("https://example.com/avatar.png");
  });

  test("rejects duplicate registration (409)", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: agent.walletAddress,
        body: { name: "AlreadyRegistered" },
      })
    );

    expect(res.status).toBe(409);
  });

  test("rejects missing name", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: {},
      })
    );

    expect(res.status).toBe(400);
  });

  test("rejects name > 50 chars", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { name: "A".repeat(51) },
      })
    );

    expect(res.status).toBe(400);
  });

  test("rejects unauthenticated request", async () => {
    const res = await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        body: { name: "NoAuth" },
      })
    );

    expect(res.status).toBe(401);
  });

  test("sets accountType to agent", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { name: "TypeTest" },
      })
    );

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    expect(dbUser.accountType).toBe("agent");
  });

  test("logs activity entry", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { name: "ActivityTest" },
      })
    );

    const [entry] = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, user.userId),
          eq(activityLog.actionType, "register")
        )
      )
      .limit(1);

    expect(entry).toBeDefined();
    expect(entry.actionType).toBe("register");
  });
});

describe("Agent Profile — GET /me", () => {
  test("returns profile by wallet (public)", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    await registerAgent(
      makeRequest("/api/v1/agents/register", {
        method: "POST",
        walletAddress: user.walletAddress,
        body: { name: "MeTest" },
      })
    );

    const res = await getMe(
      makeRequest("/api/v1/agents/me", {
        searchParams: { wallet: user.walletAddress },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("MeTest");
    expect(data.walletAddress).toBe(user.walletAddress);
  });

  test("returns 400 without wallet param", async () => {
    const res = await getMe(
      makeRequest("/api/v1/agents/me")
    );

    expect(res.status).toBe(400);
  });

  test("returns 404 for unknown wallet", async () => {
    const res = await getMe(
      makeRequest("/api/v1/agents/me", {
        searchParams: { wallet: "UnknownWallet123" },
      })
    );

    expect(res.status).toBe(404);
  });
});

describe("Agent Profile — PATCH", () => {
  test("updates profile fields", async () => {
    const agent = await createAuthenticatedAgent();
    userIds.push(agent.userId);

    const res = await updateProfile(
      makeRequest("/api/v1/agents/profile", {
        method: "PATCH",
        walletAddress: agent.walletAddress,
        body: { bio: "Updated bio", artStyle: "abstract" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bio).toBe("Updated bio");
    expect(data.artStyle).toBe("abstract");
  });

  test("rejects unregistered user (403)", async () => {
    const user = await createUnregisteredUser();
    userIds.push(user.userId);

    const res = await updateProfile(
      makeRequest("/api/v1/agents/profile", {
        method: "PATCH",
        walletAddress: user.walletAddress,
        body: { bio: "No profile yet" },
      })
    );

    expect(res.status).toBe(403);
  });

  test("rejects unauthenticated request", async () => {
    const res = await updateProfile(
      makeRequest("/api/v1/agents/profile", {
        method: "PATCH",
        body: { bio: "No auth" },
      })
    );

    expect(res.status).toBe(401);
  });
});
