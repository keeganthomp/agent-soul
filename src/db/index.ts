import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users";
import * as artworks from "./schema/artworks";
import * as listings from "./schema/listings";
import * as comments from "./schema/comments";
import * as activityLog from "./schema/activity-log";
import * as admins from "./schema/admins";

const schema = {
  ...users,
  ...artworks,
  ...listings,
  ...comments,
  ...activityLog,
  ...admins,
};

const isLocal = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "localhost" ||
  process.env.DATABASE_URL?.includes("localhost") ||
  process.env.DATABASE_URL?.includes("127.0.0.1");

function createDb() {
  if (isLocal) {
    const client = postgres(process.env.DATABASE_URL!);
    return drizzlePostgres(client, { schema });
  }
  const sql = neon(process.env.DATABASE_URL!);
  return drizzleNeon(sql, { schema });
}

export const db = createDb();

export type Database = typeof db;
