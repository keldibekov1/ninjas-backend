-- CreateTable
CREATE TABLE "BouncieConfig" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "grantType" TEXT NOT NULL DEFAULT 'authorization_code',
    "code" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BouncieConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BouncieToken" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BouncieToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BouncieConfig_tenantId_key" ON "BouncieConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "BouncieConfig" ADD CONSTRAINT "BouncieConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BouncieToken" ADD CONSTRAINT "BouncieToken_configId_fkey" FOREIGN KEY ("configId") REFERENCES "BouncieConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
