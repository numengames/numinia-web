CREATE TABLE "adventures" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"order_num" integer NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb DEFAULT '{}'::jsonb,
	"url" text NOT NULL,
	"requires_pass" boolean DEFAULT false NOT NULL,
	"duration_minutes" integer,
	"difficulty" integer,
	"puzzle_type" text,
	"published" boolean DEFAULT true NOT NULL,
	"free_loot" jsonb,
	"premium_loot" jsonb
);
--> statement-breakpoint
CREATE TABLE "asset_tags" (
	"asset_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "asset_tags_asset_id_tag_id_pk" PRIMARY KEY("asset_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical" text,
	"name" text NOT NULL,
	"project_id" text,
	"type" text,
	"description" text,
	"thumbnail_url" text,
	"model_file_url" text,
	"polygon_count" integer,
	"format" text DEFAULT '' NOT NULL,
	"material_count" integer,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active',
	"status_reason" text,
	"version" text DEFAULT '0.1.0',
	"previous_version" text,
	"license" text DEFAULT 'CC0',
	"creator" text,
	"content_type" text,
	"file_size_bytes" bigint,
	"file_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"storage_r2" text,
	"storage_ipfs_cid" text,
	"storage_arweave_tx" text,
	"storage_github_raw" text,
	"nft_type" text DEFAULT 'standard',
	"nft_mint_status" text DEFAULT 'unminted',
	"nft_chain_id" text,
	"nft_contract" text,
	"nft_token_id" text,
	"nft_owner" text,
	"nft_mint_tx" text,
	"tags" text[] DEFAULT '{}'::text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"target" text,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "download_counts" (
	"asset_id" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "favorites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"wallet_address" text NOT NULL,
	"asset_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pass_holders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pass_holders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"stripe_session_id" text NOT NULL,
	"nft_token_id" text,
	"nft_transaction_hash" text,
	"completed_adventures" text[] DEFAULT '{}'::text[],
	"burn_completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portals" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator_id" text,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"license" text DEFAULT 'CC0',
	"source_type" text,
	"source_network" text,
	"source_contract" text,
	"storage_type" text,
	"opensea_url" text,
	"asset_data_file" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb DEFAULT '{}'::jsonb,
	"status" text NOT NULL,
	"pass_price_eur" numeric(10, 2) NOT NULL,
	"stripe_price_id" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"burn_ritual" jsonb,
	CONSTRAINT "seasons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'user' NOT NULL,
	"wallet_address" text,
	"github_id" text,
	"github_username" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_counts" ADD CONSTRAINT "download_counts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pass_holders" ADD CONSTRAINT "pass_holders_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adventures_season_order_idx" ON "adventures" USING btree ("season_id","order_num");--> statement-breakpoint
CREATE INDEX "assets_project_id_idx" ON "assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "assets_format_idx" ON "assets" USING btree ("format");--> statement-breakpoint
CREATE INDEX "assets_is_public_idx" ON "assets" USING btree ("is_public","is_draft");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_nft_mint_status_idx" ON "assets" USING btree ("nft_mint_status");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_canonical_idx" ON "assets" USING btree ("canonical");--> statement-breakpoint
CREATE INDEX "audit_events_timestamp_idx" ON "audit_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_wallet_asset_idx" ON "favorites" USING btree ("wallet_address","asset_id");--> statement-breakpoint
CREATE INDEX "favorites_wallet_idx" ON "favorites" USING btree ("wallet_address");--> statement-breakpoint
CREATE UNIQUE INDEX "pass_holders_season_wallet_idx" ON "pass_holders" USING btree ("season_id","wallet_address");--> statement-breakpoint
CREATE INDEX "pass_holders_wallet_idx" ON "pass_holders" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "projects_is_public_idx" ON "projects" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "seasons_status_idx" ON "seasons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_wallet_address_idx" ON "users" USING btree ("wallet_address");