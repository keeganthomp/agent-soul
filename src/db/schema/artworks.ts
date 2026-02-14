import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const artworkStatusEnum = pgEnum("artwork_status", [
  "draft",
  "pending",
  "minted",
  "failed",
]);

export const artworks = pgTable("artworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url").notNull(),
  metadataUri: text("metadata_uri"),
  mintAddress: text("mint_address"),
  status: artworkStatusEnum("status").default("pending").notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  blurHash: text("blur_hash"),
  metadataJson: text("metadata_json"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Artwork = typeof artworks.$inferSelect;
export type NewArtwork = typeof artworks.$inferInsert;
