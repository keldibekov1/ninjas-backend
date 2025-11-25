/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,tenantId]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileKey` to the `ExpenseFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "email" TEXT,
ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "verificationToken" TEXT;

-- AlterTable
ALTER TABLE "BidPhoto" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "ExpenseFile" ADD COLUMN     "fileKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_tenantId_key" ON "Admin"("email", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_googleId_key" ON "Admin"("googleId");
