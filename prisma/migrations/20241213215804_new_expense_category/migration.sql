/*
  Warnings:

  - Added the required column `categoryId` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "categoryId" INTEGER NOT NULL,
ADD COLUMN     "orderId" INTEGER;

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_tenantId_key" ON "ExpenseCategory"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_id_tenantId_key" ON "ExpenseCategory"("id", "tenantId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_orderId_tenantId_fkey" FOREIGN KEY ("orderId", "tenantId") REFERENCES "Order"("report_id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
