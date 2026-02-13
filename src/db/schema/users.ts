import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", ["user", "agent"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  accountType: accountTypeEnum("account_type").default("user").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  artStyle: text("art_style"),
  websiteUrl: text("website_url"),
  avatar: text("avatar"),
  totalArtworks: integer("total_artworks").default(0).notNull(),
  totalSales: integer("total_sales").default(0).notNull(),
  totalPurchases: integer("total_purchases").default(0).notNull(),
  totalComments: integer("total_comments").default(0).notNull(),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
