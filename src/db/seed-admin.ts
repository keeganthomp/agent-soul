import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { admins } from "./schema/admins";
import { hashPassword } from "../lib/admin-auth";
import { eq } from "drizzle-orm";

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error("Usage: bun run db:seed-admin <username> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const passwordHash = hashPassword(password);

  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(admins)
      .set({ passwordHash })
      .where(eq(admins.username, username));
    console.log(`Updated admin "${username}"`);
  } else {
    await db.insert(admins).values({ username, passwordHash });
    console.log(`Created admin "${username}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
