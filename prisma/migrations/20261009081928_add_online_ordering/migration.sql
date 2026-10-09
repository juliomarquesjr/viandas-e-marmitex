-- AlterTable
ALTER TABLE "public"."PreOrder" ADD COLUMN     "approval" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'staff';

-- CreateTable
CREATE TABLE "public"."OrderWindow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderWindowProduct" (
    "windowId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "OrderWindowProduct_pkey" PRIMARY KEY ("windowId","productId")
);

-- CreateIndex
CREATE INDEX "OrderWindow_active_idx" ON "public"."OrderWindow"("active");

-- CreateIndex
CREATE INDEX "OrderWindowProduct_productId_idx" ON "public"."OrderWindowProduct"("productId");

-- CreateIndex
CREATE INDEX "PreOrder_source_approval_idx" ON "public"."PreOrder"("source", "approval");

-- CreateIndex
CREATE UNIQUE INDEX "PreOrder_customerId_idempotencyKey_key" ON "public"."PreOrder"("customerId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "public"."OrderWindowProduct" ADD CONSTRAINT "OrderWindowProduct_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "public"."OrderWindow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderWindowProduct" ADD CONSTRAINT "OrderWindowProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Garantias que o Prisma não modela: janela com ao menos um dia, início antes do fim, dentro das 24h
ALTER TABLE "public"."OrderWindow" ADD CONSTRAINT "OrderWindow_valid_check"
  CHECK (cardinality("weekdays") > 0 AND "startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440);
