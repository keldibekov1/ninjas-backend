-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIALING', 'INCOMPLETE', 'INCOMPLETE_EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'UNCOLLECTIBLE', 'VOID');

-- CreateTable
CREATE TABLE "stripe_customers" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_subscriptions" (
    "id" SERIAL NOT NULL,
    "stripeCustomerId" INTEGER NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_invoices" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "hostedInvoiceUrl" TEXT,
    "pdfInvoiceUrl" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_tenantId_key" ON "stripe_customers"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_customerId_key" ON "stripe_customers"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_subscriptions_subscriptionId_key" ON "stripe_subscriptions"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_invoices_invoiceId_key" ON "stripe_invoices"("invoiceId");

-- AddForeignKey
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_stripeCustomerId_fkey" FOREIGN KEY ("stripeCustomerId") REFERENCES "stripe_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_invoices" ADD CONSTRAINT "stripe_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "stripe_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
