"use server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { artworks } from "@/db/schema/artworks";
import { admins } from "@/db/schema/admins";
import { listings } from "@/db/schema/listings";
import {
  getAdminSession,
  verifyPassword,
  createSession,
  sessionCookieOptions,
  ADMIN_COOKIE_NAME,
} from "@/lib/admin-auth";
import { eq, count, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

// --- Auth ---

export async function adminLogin(username: string, password: string) {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return { error: "Invalid username or password" };
  }

  const token = createSession(admin.id, admin.username);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(token));
  redirect("/admin");
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
  redirect("/admin/login");
}

// --- Dashboard ---

export async function getAdminStats() {
  await requireAdmin();

  const [artistCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.accountType, "agent"));

  const [artworkCount] = await db.select({ count: count() }).from(artworks);

  const [listingCount] = await db
    .select({ count: count() })
    .from(listings)
    .where(eq(listings.status, "active"));

  return {
    artists: artistCount?.count ?? 0,
    artworks: artworkCount?.count ?? 0,
    activeListings: listingCount?.count ?? 0,
  };
}

// --- Artists ---

export async function getAdminArtists() {
  await requireAdmin();

  return db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
      displayName: users.displayName,
      bio: users.bio,
      artStyle: users.artStyle,
      avatar: users.avatar,
      totalArtworks: users.totalArtworks,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.accountType, "agent"))
    .orderBy(desc(users.createdAt));
}

export async function adminUpdateArtist(
  id: string,
  data: {
    displayName?: string;
    bio?: string;
    artStyle?: string;
    avatar?: string;
  }
) {
  await requireAdmin();

  await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id));

  redirect("/admin/artists");
}

export async function adminDeleteArtist(id: string) {
  await requireAdmin();
  await db.delete(users).where(eq(users.id, id));
  redirect("/admin/artists");
}

// --- Artworks ---

export async function getAdminArtworks() {
  await requireAdmin();

  return db
    .select({
      id: artworks.id,
      title: artworks.title,
      imageUrl: artworks.imageUrl,
      status: artworks.status,
      mintAddress: artworks.mintAddress,
      createdAt: artworks.createdAt,
      creatorId: artworks.creatorId,
      creatorName: users.displayName,
    })
    .from(artworks)
    .leftJoin(users, eq(artworks.creatorId, users.id))
    .orderBy(desc(artworks.createdAt));
}

export async function adminUpdateArtwork(
  id: string,
  data: {
    title?: string;
    status?: "draft" | "pending" | "minted" | "failed";
  }
) {
  await requireAdmin();

  await db
    .update(artworks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(artworks.id, id));

  redirect("/admin/artworks");
}

export async function adminDeleteArtwork(id: string) {
  await requireAdmin();
  await db.delete(artworks).where(eq(artworks.id, id));
  redirect("/admin/artworks");
}
