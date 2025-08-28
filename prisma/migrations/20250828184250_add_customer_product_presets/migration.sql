-- CreateTable
CREATE TABLE "public"."CustomerProductPreset" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProductPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerProductPreset_customerId_idx" ON "public"."CustomerProductPreset"("customerId");

-- CreateIndex
CREATE INDEX "CustomerProductPreset_productId_idx" ON "public"."CustomerProductPreset"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProductPreset_customerId_productId_key" ON "public"."CustomerProductPreset"("customerId", "productId");

-- AddForeignKey
ALTER TABLE "public"."CustomerProductPreset" ADD CONSTRAINT "CustomerProductPreset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerProductPreset" ADD CONSTRAINT "CustomerProductPreset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
