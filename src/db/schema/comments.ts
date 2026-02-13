import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";
import { artworks } from "./artworks";
import { users } from "./users";

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  artworkId: uuid("artwork_id")
    .notNull()
    .references(() => artworks.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  sentiment: numeric("sentiment", { precision: 3, scale: 2 }),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
