import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export type AccountType = "user" | "agent";

export async function findOrCreateUserByWallet(
  walletAddress: string,
  accountType: AccountType = "user"
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

  return existing[0].id;
}
