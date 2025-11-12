CREATE TYPE "public"."calculation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'in_review', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('pharmacist', 'admin', 'user');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	"session_id" text,
	"input_data" jsonb NOT NULL,
	"normalized_data" jsonb,
	"rxcui" text,
	"ndc_codes" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"processing_time" integer,
	"confidence_score" real
);
--> statement-breakpoint
CREATE TABLE "cache_invalidation" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"cache_key" text NOT NULL,
	"reason" text NOT NULL,
	"invalidated_by" text
);
--> statement-breakpoint
CREATE TABLE "calculation_audits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"prescription_text" text NOT NULL,
	"parsed_result" jsonb,
	"confidence_score" real,
	"selected_packages" jsonb,
	"status" "calculation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rxcui" text,
	"ndc_codes" jsonb,
	"processing_time" integer
);
--> statement-breakpoint
CREATE TABLE "manual_review_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"calculation_id" text NOT NULL,
	"assigned_to" text,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ndc_package" (
	"id" text PRIMARY KEY NOT NULL,
	"ndc" text NOT NULL,
	"product_ndc" text NOT NULL,
	"generic_name" text NOT NULL,
	"labeler_name" text NOT NULL,
	"brand_name" text,
	"dosage_form" text NOT NULL,
	"route" jsonb NOT NULL,
	"strength" text NOT NULL,
	"package_description" text NOT NULL,
	"package_quantity" integer NOT NULL,
	"package_unit" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ndc_package_ndc_unique" UNIQUE("ndc")
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"priority" "priority" DEFAULT 'MEDIUM' NOT NULL,
	"prescription_input" jsonb NOT NULL,
	"normalized_output" jsonb,
	"confidence_score" real NOT NULL,
	"reviewer_id" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"corrected_output" jsonb,
	"audit_log_id" text
);
--> statement-breakpoint
CREATE TABLE "rxcui_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"drug_name" text NOT NULL,
	"strength" text,
	"form" text,
	"rxcui" text NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"firebase_uid" text,
	"display_name" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
ALTER TABLE "calculation_audits" ADD CONSTRAINT "calculation_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_review_queue" ADD CONSTRAINT "manual_review_queue_calculation_id_calculation_audits_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculation_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_review_queue" ADD CONSTRAINT "manual_review_queue_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_rxcui_idx" ON "audit_log" USING btree ("rxcui");--> statement-breakpoint
CREATE INDEX "cache_invalidation_timestamp_idx" ON "cache_invalidation" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "calculation_audits_user_id_idx" ON "calculation_audits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calculation_audits_status_idx" ON "calculation_audits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "calculation_audits_created_at_idx" ON "calculation_audits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "calculation_audits_rxcui_idx" ON "calculation_audits" USING btree ("rxcui");--> statement-breakpoint
CREATE INDEX "manual_review_queue_calculation_id_idx" ON "manual_review_queue" USING btree ("calculation_id");--> statement-breakpoint
CREATE INDEX "manual_review_queue_assigned_to_idx" ON "manual_review_queue" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "manual_review_queue_status_idx" ON "manual_review_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "manual_review_queue_priority_idx" ON "manual_review_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "manual_review_queue_created_at_idx" ON "manual_review_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ndc_package_product_ndc_idx" ON "ndc_package" USING btree ("product_ndc");--> statement-breakpoint
CREATE INDEX "ndc_package_generic_name_idx" ON "ndc_package" USING btree ("generic_name");--> statement-breakpoint
CREATE INDEX "ndc_package_is_active_idx" ON "ndc_package" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "review_queue_status_idx" ON "review_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "review_queue_priority_idx" ON "review_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "review_queue_created_at_idx" ON "review_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rxcui_mapping_rxcui_idx" ON "rxcui_mapping" USING btree ("rxcui");--> statement-breakpoint
CREATE UNIQUE INDEX "rxcui_mapping_drug_name_unique" ON "rxcui_mapping" USING btree ("drug_name","strength","form");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_firebase_uid_idx" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");