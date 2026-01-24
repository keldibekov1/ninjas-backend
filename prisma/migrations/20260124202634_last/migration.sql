-- CreateEnum (safe)
DO $$
BEGIN
  CREATE TYPE "PhotoType" AS ENUM ('BID', 'PROGRESS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (safe)
DO $$
BEGIN
  CREATE TYPE "TaskTimeStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable (safe)
ALTER TABLE "BidPhoto"
  ADD COLUMN IF NOT EXISTS "photoType" "PhotoType" NOT NULL DEFAULT 'BID';

ALTER TABLE "BidPhoto"
  ADD COLUMN IF NOT EXISTS "taskItemId" INTEGER;

-- AlterTable (safe)
ALTER TABLE "TaskTimeRecord"
  ADD COLUMN IF NOT EXISTS "pause_reason" TEXT;

ALTER TABLE "TaskTimeRecord"
  ADD COLUMN IF NOT EXISTS "status" "TaskTimeStatus" NOT NULL DEFAULT 'RUNNING';

-- CreateTable (safe)
CREATE TABLE IF NOT EXISTS "Tst" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Tst_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (safe)
CREATE INDEX IF NOT EXISTS "TaskTimeRecord_tenantId_task_id_worker_id_idx"
ON "TaskTimeRecord"("tenantId", "task_id", "worker_id");
