-- CreateTable
CREATE TABLE "crews" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_members" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "crewId" INTEGER NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crew_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_assignments" (
    "id" SERIAL NOT NULL,
    "crewId" INTEGER NOT NULL,
    "reportId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "crew_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNoteFile" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "jobNoteId" INTEGER NOT NULL,

    CONSTRAINT "JobNoteFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseFile" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expenseId" INTEGER NOT NULL,

    CONSTRAINT "ExpenseFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crews_name_tenantId_key" ON "crews"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "crews_id_tenantId_key" ON "crews"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "crew_members_workerId_crewId_key" ON "crew_members"("workerId", "crewId");

-- CreateIndex
CREATE UNIQUE INDEX "crew_assignments_crewId_reportId_key" ON "crew_assignments"("crewId", "reportId");

-- AddForeignKey
ALTER TABLE "crews" ADD CONSTRAINT "crews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_reportId_tenantId_fkey" FOREIGN KEY ("reportId", "tenantId") REFERENCES "Order"("report_id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNoteFile" ADD CONSTRAINT "JobNoteFile_jobNoteId_fkey" FOREIGN KEY ("jobNoteId") REFERENCES "JobNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseFile" ADD CONSTRAINT "ExpenseFile_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
