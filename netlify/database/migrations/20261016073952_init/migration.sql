CREATE TABLE "member" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_set" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"status" text NOT NULL,
	"version" integer,
	"rules" jsonb NOT NULL,
	"tests" jsonb NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	"published_at" timestamp with time zone,
	"published_by" text
);
--> statement-breakpoint
CREATE TABLE "sale_check" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text,
	"rule_set_id" text NOT NULL,
	"rule_set_version" integer NOT NULL,
	"order_ref" text,
	"input" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"vies_lookup_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vat_rate" (
	"id" text PRIMARY KEY,
	"country" text NOT NULL,
	"rate" double precision NOT NULL,
	"effective_from" date NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "vies_lookup" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text,
	"country_code" text NOT NULL,
	"vat_number" text NOT NULL,
	"state" text NOT NULL,
	"code" text,
	"name" text,
	"address" text,
	"request_identifier" text,
	"request_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uq" ON "member" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_user_idx" ON "member" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_set_org_version_uq" ON "rule_set" ("organization_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_set_one_draft_uq" ON "rule_set" ("organization_id") WHERE status = 'draft';--> statement-breakpoint
CREATE INDEX "sale_check_org_created_idx" ON "sale_check" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "sale_check_org_ref_idx" ON "sale_check" ("organization_id","order_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "vat_rate_country_from_uq" ON "vat_rate" ("country","effective_from");--> statement-breakpoint
CREATE INDEX "vies_lookup_org_idx" ON "vies_lookup" ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rule_set" ADD CONSTRAINT "rule_set_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rule_set" ADD CONSTRAINT "rule_set_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "rule_set" ADD CONSTRAINT "rule_set_published_by_user_id_fkey" FOREIGN KEY ("published_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sale_check" ADD CONSTRAINT "sale_check_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sale_check" ADD CONSTRAINT "sale_check_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sale_check" ADD CONSTRAINT "sale_check_rule_set_id_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "rule_set"("id");--> statement-breakpoint
ALTER TABLE "sale_check" ADD CONSTRAINT "sale_check_vies_lookup_id_vies_lookup_id_fkey" FOREIGN KEY ("vies_lookup_id") REFERENCES "vies_lookup"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vat_rate" ADD CONSTRAINT "vat_rate_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vies_lookup" ADD CONSTRAINT "vies_lookup_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vies_lookup" ADD CONSTRAINT "vies_lookup_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;