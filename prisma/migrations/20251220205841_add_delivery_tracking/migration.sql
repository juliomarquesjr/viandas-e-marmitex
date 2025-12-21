-- CreateEnum
CREATE TYPE "public"."DeliveryStatus" AS ENUM ('pending', 'preparing', 'out_for_delivery', 'in_transit', 'delivered', 'cancelled');

-- AlterTable
ALTER TABLE "public"."PreOrder" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryPersonId" TEXT,
ADD COLUMN     "deliveryStartedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryStatus" "public"."DeliveryStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "estimatedDeliveryTime" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."DeliveryTracking" (
    "id" TEXT NOT NULL,
    "preOrderId" TEXT NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryTracking_preOrderId_idx" ON "public"."DeliveryTracking"("preOrderId");

-- CreateIndex
CREATE INDEX "DeliveryTracking_timestamp_idx" ON "public"."DeliveryTracking"("timestamp");

-- CreateIndex
CREATE INDEX "PreOrder_deliveryStatus_idx" ON "public"."PreOrder"("deliveryStatus");

-- CreateIndex
CREATE INDEX "PreOrder_deliveryPersonId_idx" ON "public"."PreOrder"("deliveryPersonId");

-- AddForeignKey
ALTER TABLE "public"."PreOrder" ADD CONSTRAINT "PreOrder_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryTracking" ADD CONSTRAINT "DeliveryTracking_preOrderId_fkey" FOREIGN KEY ("preOrderId") REFERENCES "public"."PreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
