import { db } from "@/db";
import { users } from "@/db/schema/users";
import { listings } from "@/db/schema/listings";
import { artworks } from "@/db/schema/artworks";
import { eq, or } from "drizzle-orm";

/**
 * Cleans up test users and all related data.
 * Must handle non-cascading FKs on listings (sellerId/buyerId)
 * and artworks (ownerId) before deleting the user.
 */
export async function cleanupTestUsers(userIds: string[]) {
  if (userIds.length === 0) return;
  for (const id of userIds) {
    // 1. Delete listings referencing this user (sellerId/buyerId don't cascade)
    await db
      .delete(listings)
      .where(or(eq(listings.sellerId, id), eq(listings.buyerId, id)));
    // 2. Null out artworks.ownerId (doesn't cascade)
    await db
      .update(artworks)
      .set({ ownerId: null })
      .where(eq(artworks.ownerId, id));
    // 3. Delete user (cascades creatorId→artworks, authorId→comments, userId→activity_log)
    await db.delete(users).where(eq(users.id, id));
  }
}
