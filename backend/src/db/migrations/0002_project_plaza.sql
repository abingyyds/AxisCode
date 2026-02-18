ALTER TABLE "projects" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tags" varchar(500);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL REFERENCES "projects"("id"),
	"user_id" uuid NOT NULL REFERENCES "users"("id"),
	"task_id" uuid NOT NULL REFERENCES "tasks"("id"),
	"score" integer,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
