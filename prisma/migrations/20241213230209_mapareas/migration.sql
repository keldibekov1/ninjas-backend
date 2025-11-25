/*
  Warnings:

  - You are about to drop the `MapArea` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MapArea" DROP CONSTRAINT "MapArea_created_by_fkey";

-- DropForeignKey
ALTER TABLE "MapArea" DROP CONSTRAINT "MapArea_tenant_id_fkey";

-- DropTable
DROP TABLE "MapArea";

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

-- CreateIndex
CREATE INDEX "map_areas_tenant_id_idx" ON "map_areas"("tenant_id");

-- CreateIndex
CREATE INDEX "map_areas_created_by_idx" ON "map_areas"("created_by");

-- AddForeignKey
ALTER TABLE "map_areas" ADD CONSTRAINT "map_areas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_areas" ADD CONSTRAINT "map_areas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
