import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { artworks } from "./artworks";
import { users } from "./users";

export const listingTypeEnum = pgEnum("listing_type", ["fixed", "auction"]);
export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "sold",
  "cancelled",
]);

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  artworkId: uuid("artwork_id")
    .notNull()
    .references(() => artworks.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id),
  buyerId: uuid("buyer_id").references(() => users.id),
  priceSol: numeric("price_sol", { precision: 18, scale: 9 }).notNull(),
  listingType: listingTypeEnum("listing_type").default("fixed").notNull(),
  status: listingStatusEnum("status").default("active").notNull(),
  txSignature: text("tx_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
