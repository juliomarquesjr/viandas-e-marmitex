-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_barcode_key" ON "public"."Customer"("barcode");