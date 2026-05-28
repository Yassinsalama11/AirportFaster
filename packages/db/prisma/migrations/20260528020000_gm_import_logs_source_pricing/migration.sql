CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "ImportLogStatus" AS ENUM ('running', 'success', 'partial', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "pricing_rules"
  ADD COLUMN IF NOT EXISTS "source_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "source_external_id" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "source_synced_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "pricing_rules_source_name_source_external_id_key"
  ON "pricing_rules"("source_name", "source_external_id");

CREATE TABLE IF NOT EXISTS "import_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_name" VARCHAR(120) NOT NULL,
  "job_name" VARCHAR(120) NOT NULL,
  "status" "ImportLogStatus" NOT NULL DEFAULT 'running',
  "sync_started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sync_finished_at" TIMESTAMPTZ,
  "records_seen" INTEGER NOT NULL DEFAULT 0,
  "records_imported" INTEGER NOT NULL DEFAULT 0,
  "records_updated" INTEGER NOT NULL DEFAULT 0,
  "records_skipped" INTEGER NOT NULL DEFAULT 0,
  "records_failed" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "import_logs_source_name_job_name_sync_started_at_idx"
  ON "import_logs"("source_name", "job_name", "sync_started_at");

CREATE INDEX IF NOT EXISTS "import_logs_status_idx"
  ON "import_logs"("status");

CREATE TABLE IF NOT EXISTS "failed_imports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "import_log_id" UUID NOT NULL,
  "source_name" VARCHAR(120) NOT NULL,
  "entity_type" VARCHAR(80) NOT NULL,
  "source_key" VARCHAR(180),
  "reason" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "failed_imports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "failed_imports_import_log_id_fkey"
    FOREIGN KEY ("import_log_id") REFERENCES "import_logs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "failed_imports_import_log_id_idx"
  ON "failed_imports"("import_log_id");

CREATE INDEX IF NOT EXISTS "failed_imports_source_name_entity_type_idx"
  ON "failed_imports"("source_name", "entity_type");
