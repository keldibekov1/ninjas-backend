/*
  Warnings:

  - You are about to drop the `map_areas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "map_areas" DROP CONSTRAINT "map_areas_created_by_fkey";

-- DropForeignKey
ALTER TABLE "map_areas" DROP CONSTRAINT "map_areas_tenant_id_fkey";

-- DropTable
DROP TABLE "map_areas";

-- CreateTable
CREATE TABLE "MapArea" (
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

    CONSTRAINT "MapArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapArea_tenant_id_idx" ON "MapArea"("tenant_id");

-- CreateIndex
CREATE INDEX "MapArea_created_by_idx" ON "MapArea"("created_by");

-- AddForeignKey
ALTER TABLE "MapArea" ADD CONSTRAINT "MapArea_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapArea" ADD CONSTRAINT "MapArea_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
