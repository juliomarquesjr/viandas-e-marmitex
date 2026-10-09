-- CreateTable
CREATE TABLE "public"."CustomerDismissal" (
    "customerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDismissal_pkey" PRIMARY KEY ("customerId","key")
);

-- CreateIndex
CREATE INDEX "CustomerDismissal_customerId_createdAt_idx" ON "public"."CustomerDismissal"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."CustomerDismissal" ADD CONSTRAINT "CustomerDismissal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

