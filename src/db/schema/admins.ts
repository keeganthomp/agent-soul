import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
