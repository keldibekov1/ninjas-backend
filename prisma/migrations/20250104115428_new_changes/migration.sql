-- CreateTable
CREATE TABLE "sync_status" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_status_tenantId_key" ON "sync_status"("tenantId");
