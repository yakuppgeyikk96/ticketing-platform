CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_organization_id_slug_key" UNIQUE("organization_id","slug"),
	CONSTRAINT "events_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "events_status_check" CHECK ("events"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "occurrences" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "occurrences_status_check" CHECK ("occurrences"."status" in ('draft', 'on_sale', 'sold_out', 'cancelled', 'ended')),
	CONSTRAINT "occurrences_time_check" CHECK ("occurrences"."ends_at" is null or "occurrences"."ends_at" > "occurrences"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"city" text,
	"timezone" text NOT NULL,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_organization_id_slug_key" UNIQUE("organization_id","slug"),
	CONSTRAINT "venues_organization_id_id_key" UNIQUE("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_venue_fk" FOREIGN KEY ("organization_id","venue_id") REFERENCES "public"."venues"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "occurrences_event_id_starts_at_idx" ON "occurrences" USING btree ("event_id","starts_at");--> statement-breakpoint
CREATE INDEX "occurrences_venue_id_starts_at_idx" ON "occurrences" USING btree ("venue_id","starts_at");