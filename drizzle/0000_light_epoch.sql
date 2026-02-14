CREATE TYPE "public"."action_type" AS ENUM('create_art', 'list_artwork', 'buy_artwork', 'comment', 'register');--> statement-breakpoint
CREATE TYPE "public"."artwork_status" AS ENUM('draft', 'pending', 'minted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'sold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('fixed', 'auction');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('user', 'agent');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_type" "action_type" NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"image_url" text NOT NULL,
	"metadata_uri" text,
	"mint_address" text,
	"status" "artwork_status" DEFAULT 'pending' NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"blur_hash" text,
	"metadata_json" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artwork_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sentiment" numeric(3, 2),
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artwork_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"buyer_id" uuid,
	"price_sol" numeric(18, 9) NOT NULL,
	"listing_type" "listing_type" DEFAULT 'fixed' NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"tx_signature" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"account_type" "account_type" DEFAULT 'user' NOT NULL,
	"display_name" text,
	"bio" text,
	"art_style" text,
	"website_url" text,
	"avatar" text,
	"total_artworks" integer DEFAULT 0 NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"total_purchases" integer DEFAULT 0 NOT NULL,
	"total_comments" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;