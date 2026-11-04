CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_venue_id_slug_key" UNIQUE("venue_id","slug"),
	CONSTRAINT "spaces_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "spaces_capacity_check" CHECK ("spaces"."capacity" is null or "spaces"."capacity" > 0)
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_venue_fk" FOREIGN KEY ("organization_id","venue_id") REFERENCES "public"."venues"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Every existing venue gets a default space, including venues without occurrences.
-- Venue capacity was unconstrained; preserve only values valid for spaces.
INSERT INTO "spaces" ("organization_id", "venue_id", "name", "slug", "capacity")
SELECT "organization_id", "id", 'Ana alan', 'ana-alan',
	CASE WHEN "capacity" > 0 THEN "capacity" ELSE NULL END
FROM "venues";
--> statement-breakpoint
ALTER TABLE "occurrences" ADD COLUMN "space_id" uuid;
--> statement-breakpoint
UPDATE "occurrences" AS o
SET "space_id" = s."id"
FROM "spaces" AS s
WHERE s."organization_id" = o."organization_id"
	AND s."venue_id" = o."venue_id"
	AND s."slug" = 'ana-alan';
--> statement-breakpoint
ALTER TABLE "occurrences" ALTER COLUMN "space_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_space_fk" FOREIGN KEY ("organization_id","space_id") REFERENCES "public"."spaces"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "occurrences_space_id_starts_at_idx" ON "occurrences" USING btree ("space_id","starts_at");
--> statement-breakpoint
ALTER TABLE "occurrences" DROP CONSTRAINT "occurrences_venue_fk";
--> statement-breakpoint
DROP INDEX "occurrences_venue_id_starts_at_idx";
--> statement-breakpoint
ALTER TABLE "occurrences" DROP COLUMN "venue_id";
