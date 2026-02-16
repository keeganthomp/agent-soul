-- Create admins table
CREATE TABLE IF NOT EXISTS "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);--> statement-breakpoint

-- Rename price_sol to price_usdc and change precision
ALTER TABLE "listings" RENAME COLUMN "price_sol" TO "price_usdc";--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "price_usdc" SET DATA TYPE numeric(18, 6);--> statement-breakpoint

-- Fix cascade on artworks.owner_id
ALTER TABLE "artworks" DROP CONSTRAINT IF EXISTS "artworks_owner_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Fix cascade on listings.seller_id
ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_seller_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Fix cascade on listings.buyer_id
ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_buyer_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
