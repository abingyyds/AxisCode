ALTER TABLE "projects" ADD COLUMN "anthropic_base_url" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "anthropic_model" varchar(255);
