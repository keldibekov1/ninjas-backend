
CREATE EXTENSION IF NOT EXISTS postgis;
-- CreateEnum
CREATE TYPE "GlobalRoleEnum" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('ADMIN', 'MANAGER', 'QC');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'COMPLETED', 'REJECTED', 'UNCOMPLETED');

-- CreateEnum
CREATE TYPE "ExpenseEnum" AS ENUM ('TELEGRAM_BOT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExpenseAction" AS ENUM ('SPENDING', 'PENALTY');

-- CreateTable
CREATE TABLE "map_areas" (
    "id" SERIAL NOT NULL,
    "geometry" JSONB NOT NULL,
    "area_size" DOUBLE PRECISION NOT NULL,
    "name" VARCHAR(255),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalAdmin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "GlobalRoleEnum" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'BASIC',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ppwUsername" TEXT,
    "ppwPasswordHash" TEXT,
    "ppwSiteId" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "hourly_pay_rate" DOUBLE PRECISION,
    "daily_pay_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "extra_hourly_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "report_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "report_id" INTEGER NOT NULL,
    "wo_number" TEXT,
    "org_wo_num" INTEGER,
    "wo_status" TEXT,
    "client_company_alias" TEXT,
    "cust_text" TEXT,
    "loan_number" TEXT,
    "loan_type_other" TEXT,
    "date_received" TEXT,
    "date_due" TEXT,
    "start_date" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "comments" TEXT,
    "work_type_alias" TEXT,
    "mortgage_name" TEXT,
    "ppw_report_id" DOUBLE PRECISION,
    "import_user_id" TEXT,
    "mcs_woid" TEXT,
    "bg_checkin_provider" TEXT,
    "autoimport_client_orig" TEXT,
    "wo_number_orig" TEXT,
    "wo_photo_ts_format" TEXT,
    "autoimport_userid" TEXT,
    "lot_size" TEXT,
    "lock_code" TEXT,
    "key_code" TEXT,
    "broker_name" TEXT,
    "broker_company" TEXT,
    "broker_phone" TEXT,
    "broker_email" TEXT,
    "has_foh" BOOLEAN,
    "coordinates" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "completed_date" TIMESTAMP(3),
    "bit_photos_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNote" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "report_id" INTEGER NOT NULL,
    "note_text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "report_id" INTEGER NOT NULL,
    "desc" TEXT,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "add" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedWorker" INTEGER,
    "completedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidPhoto" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "taskItem" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderDoc" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FolderDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileDoc" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "folderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTimeRecord" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "worker_id" INTEGER,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "spent_time" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTimeRecord" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "clockin_time" DOUBLE PRECISION NOT NULL,
    "finishjob_time" DOUBLE PRECISION NOT NULL,
    "clockout_time" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taskitems" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Taskitems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "workerId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "action" "ExpenseAction",
    "comment" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" "ExpenseEnum" DEFAULT 'TELEGRAM_BOT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "spentTime" TEXT NOT NULL,
    "syncedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "role" "RoleEnum",
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "map_areas_tenant_id_idx" ON "map_areas"("tenant_id");

-- CreateIndex
CREATE INDEX "map_areas_created_by_idx" ON "map_areas"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalAdmin_username_key" ON "GlobalAdmin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_ppwSiteId_key" ON "Tenant"("ppwSiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_username_tenantId_key" ON "Worker"("username", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_id_tenantId_key" ON "Worker"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_id_tenantId_key" ON "Assignment"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_report_id_tenantId_key" ON "Order"("report_id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_id_tenantId_key" ON "Order"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_tenantId_key" ON "Task"("id", "tenantId");

-- CreateIndex
CREATE INDEX "BidPhoto_orderId_idx" ON "BidPhoto"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "BidPhoto_id_tenantId_key" ON "BidPhoto"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderDoc_id_tenantId_key" ON "FolderDoc"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FileDoc_id_tenantId_key" ON "FileDoc"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTimeRecord_id_tenantId_key" ON "TaskTimeRecord"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTimeRecord_id_tenantId_key" ON "ShiftTimeRecord"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Taskitems_item_name_tenantId_key" ON "Taskitems"("item_name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Taskitems_id_tenantId_key" ON "Taskitems"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_id_tenantId_key" ON "Expense"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncLog_id_tenantId_key" ON "SyncLog"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_tenantId_key" ON "Admin"("username", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_id_tenantId_key" ON "Admin"("id", "tenantId");

-- AddForeignKey
ALTER TABLE "map_areas" ADD CONSTRAINT "map_areas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_areas" ADD CONSTRAINT "map_areas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_report_id_tenantId_fkey" FOREIGN KEY ("report_id", "tenantId") REFERENCES "Order"("report_id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_report_id_tenantId_fkey" FOREIGN KEY ("report_id", "tenantId") REFERENCES "Order"("report_id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedWorker_fkey" FOREIGN KEY ("completedWorker") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_report_id_tenantId_fkey" FOREIGN KEY ("report_id", "tenantId") REFERENCES "Order"("report_id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPhoto" ADD CONSTRAINT "BidPhoto_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPhoto" ADD CONSTRAINT "BidPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderDoc" ADD CONSTRAINT "FolderDoc_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FolderDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderDoc" ADD CONSTRAINT "FolderDoc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileDoc" ADD CONSTRAINT "FileDoc_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FolderDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileDoc" ADD CONSTRAINT "FileDoc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTimeRecord" ADD CONSTRAINT "TaskTimeRecord_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTimeRecord" ADD CONSTRAINT "TaskTimeRecord_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTimeRecord" ADD CONSTRAINT "TaskTimeRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTimeRecord" ADD CONSTRAINT "ShiftTimeRecord_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTimeRecord" ADD CONSTRAINT "ShiftTimeRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Taskitems" ADD CONSTRAINT "Taskitems_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
