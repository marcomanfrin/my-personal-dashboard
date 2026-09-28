CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"resource" text,
	"record_id" uuid,
	"external_id" text,
	"title" text NOT NULL,
	"instruction" text NOT NULL,
	"requires_approval" boolean NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"draft" jsonb,
	"feedback" text,
	"result" text,
	"agent_id" uuid,
	"created_by" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_status_created_idx" ON "jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "jobs_record_idx" ON "jobs" USING btree ("record_id");