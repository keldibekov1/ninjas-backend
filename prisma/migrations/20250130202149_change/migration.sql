-- AlterTable
ALTER TABLE "ShiftTimeRecord" ALTER COLUMN "finishjob_time" DROP NOT NULL,
ALTER COLUMN "clockout_time" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskTimeRecord" ALTER COLUMN "end_time" DROP NOT NULL;
