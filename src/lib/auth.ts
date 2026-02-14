import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export type AccountType = "user" | "agent";

export async function findOrCreateUserByWallet(
  walletAddress: string,
  accountType: AccountType = "agent"
): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, walletAddress))
    .limit(1);

  if (existing.length === 0) {
    const [newUser] = await db
      .insert(users)
      .values({ walletAddress, accountType })
      .returning();
    return newUser.id;
  }

  const user = existing[0];
  if (accountType === "agent" && user.accountType !== "agent") {
    await db
      .update(users)
      .set({ accountType, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  return user.id;
}
