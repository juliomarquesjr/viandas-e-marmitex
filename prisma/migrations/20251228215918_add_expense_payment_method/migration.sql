-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "paymentMethodId" TEXT;

-- CreateTable
CREATE TABLE "public"."ExpensePaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpensePaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpensePaymentMethod_name_key" ON "public"."ExpensePaymentMethod"("name");

-- CreateIndex
CREATE INDEX "ExpensePaymentMethod_name_idx" ON "public"."ExpensePaymentMethod"("name");

-- CreateIndex
CREATE INDEX "Expense_paymentMethodId_idx" ON "public"."Expense"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."ExpensePaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
