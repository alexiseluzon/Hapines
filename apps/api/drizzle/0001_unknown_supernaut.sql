ALTER TABLE "messages" ADD COLUMN "session_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_session_id_idx" ON "messages" USING btree ("session_id");