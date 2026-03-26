-- CreateTable
CREATE TABLE "public"."CustomerBudget" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "budgetData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerBudget_customerId_idx" ON "public"."CustomerBudget"("customerId");

-- CreateIndex
CREATE INDEX "CustomerBudget_createdAt_idx" ON "public"."CustomerBudget"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."CustomerBudget" ADD CONSTRAINT "CustomerBudget_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
