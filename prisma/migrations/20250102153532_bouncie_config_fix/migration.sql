/*
  Warnings:

  - You are about to drop the `BouncieToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BouncieToken" DROP CONSTRAINT "BouncieToken_configId_fkey";

-- AlterTable
ALTER TABLE "BouncieConfig" ADD COLUMN     "accessToken" TEXT;

-- DropTable
DROP TABLE "BouncieToken";
