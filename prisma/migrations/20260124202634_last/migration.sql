-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "PhotoType" AS ENUM ('BID', 'PROGRESS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "TaskTimeStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "BidPhoto" ADD COLUMN     "photoType" "PhotoType" NOT NULL DEFAULT 'BID',
ADD COLUMN     "taskItemId" INTEGER;

-- AlterTable
ALTER TABLE "TaskTimeRecord" ADD COLUMN     "pause_reason" TEXT,
ADD COLUMN     "status" "TaskTimeStatus" NOT NULL DEFAULT 'RUNNING';

-- CreateTable
CREATE TABLE "Tst" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tst_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskTimeRecord_tenantId_task_id_worker_id_idx" ON "TaskTimeRecord"("tenantId", "task_id", "worker_id");
