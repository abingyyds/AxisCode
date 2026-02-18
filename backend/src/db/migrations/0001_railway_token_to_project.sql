ALTER TABLE "projects" ADD COLUMN "railway_token" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "anthropic_key" text;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "railway_token";
