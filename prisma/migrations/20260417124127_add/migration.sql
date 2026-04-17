-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_reason" TEXT;
