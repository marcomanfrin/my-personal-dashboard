CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from" jsonb NOT NULL,
	"subject" text NOT NULL,
	"preview" text NOT NULL,
	"body" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"attachments" text[] NOT NULL,
	"deadline" timestamp with time zone,
	"read" boolean NOT NULL,
	"done" boolean NOT NULL,
	CONSTRAINT "emails_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"category" text NOT NULL,
	"location" text,
	"video_link" text,
	"important" boolean NOT NULL,
	"attendees" text[] NOT NULL,
	"notes" text,
	CONSTRAINT "events_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "gantt_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"project_key" text NOT NULL,
	"key" text NOT NULL,
	"tags" text[] NOT NULL,
	"title" text NOT NULL,
	"assignee" text NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"deadline" timestamp with time zone,
	"progress" double precision NOT NULL,
	"depends_on" text[] NOT NULL,
	CONSTRAINT "gantt_tasks_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "gantt_tasks_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"repo" text NOT NULL,
	"number" integer,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"state" text NOT NULL,
	"level" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"acknowledged" boolean NOT NULL,
	CONSTRAINT "issues_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"owner" text NOT NULL,
	CONSTRAINT "projects_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "projects_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pulls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"repo" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"status" text NOT NULL,
	"checks" jsonb NOT NULL,
	"review_requested" boolean NOT NULL,
	"involved" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"priority" text NOT NULL,
	"blocked_by" text,
	CONSTRAINT "pulls_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"has_time" boolean NOT NULL,
	"priority" text NOT NULL,
	"category" text NOT NULL,
	"done" boolean NOT NULL,
	CONSTRAINT "reminders_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"agent_id" uuid,
	"synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"column" text NOT NULL,
	"board" text NOT NULL,
	"labels" text[] NOT NULL,
	"due" timestamp with time zone,
	"checklist" jsonb,
	CONSTRAINT "tasks_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"resource" text,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb NOT NULL,
	"summary" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "agents_name_unique" UNIQUE("name"),
	CONSTRAINT "agents_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource" text NOT NULL,
	"type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"changes" jsonb NOT NULL,
	"previous" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" text,
	"agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulls" ADD CONSTRAINT "pulls_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_received_idx" ON "emails" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "events_start_idx" ON "events" USING btree ("start");--> statement-breakpoint
CREATE INDEX "gantt_tasks_assignee_idx" ON "gantt_tasks" USING btree ("assignee");--> statement-breakpoint
CREATE INDEX "agent_runs_resource_started_idx" ON "agent_runs" USING btree ("resource","started_at");--> statement-breakpoint
CREATE INDEX "actions_resource_status_idx" ON "actions" USING btree ("resource","status","created_at");--> statement-breakpoint
CREATE INDEX "actions_external_idx" ON "actions" USING btree ("resource","external_id");