-- CreateEnum
CREATE TYPE "ShiftActionType" AS ENUM ('CLOCK_IN', 'FINISH_JOB', 'CLOCK_OUT');

-- CreateTable
CREATE TABLE "ShiftAction" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "type" "ShiftActionType" NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "deviceId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftAction_shiftId_idx" ON "ShiftAction"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAction_workerId_idx" ON "ShiftAction"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAction_tenantId_clientRequestId_key" ON "ShiftAction"("tenantId", "clientRequestId");

-- AddForeignKey
ALTER TABLE "ShiftAction" ADD CONSTRAINT "ShiftAction_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftTimeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAction" ADD CONSTRAINT "ShiftAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
