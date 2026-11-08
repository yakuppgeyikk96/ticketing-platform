CREATE TABLE "space_layout_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_layout_versions_layout_id_version_key" UNIQUE("layout_id","version"),
	CONSTRAINT "space_layout_versions_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "space_layout_versions_version_check" CHECK ("space_layout_versions"."version" > 0),
	CONSTRAINT "space_layout_versions_status_check" CHECK ("space_layout_versions"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "space_layout_versions_dimensions_check" CHECK ("space_layout_versions"."width" > 0 and "space_layout_versions"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "space_layouts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_layouts_organization_id_id_key" UNIQUE("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "space_layout_versions" ADD CONSTRAINT "space_layout_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_layout_versions" ADD CONSTRAINT "space_layout_versions_layout_fk" FOREIGN KEY ("organization_id","layout_id") REFERENCES "public"."space_layouts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_layouts" ADD CONSTRAINT "space_layouts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_layouts" ADD CONSTRAINT "space_layouts_space_fk" FOREIGN KEY ("organization_id","space_id") REFERENCES "public"."spaces"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "space_layout_versions_one_draft_idx" ON "space_layout_versions" USING btree ("layout_id") WHERE "space_layout_versions"."status" = 'draft';--> statement-breakpoint
CREATE INDEX "space_layouts_space_id_idx" ON "space_layouts" USING btree ("space_id");