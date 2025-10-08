-- CreateTable
CREATE TABLE "public"."ExpenseType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupplierType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "supplierTypeId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseType_name_key" ON "public"."ExpenseType"("name");

-- CreateIndex
CREATE INDEX "ExpenseType_name_idx" ON "public"."ExpenseType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierType_name_key" ON "public"."SupplierType"("name");

-- CreateIndex
CREATE INDEX "SupplierType_name_idx" ON "public"."SupplierType"("name");

-- CreateIndex
CREATE INDEX "Expense_typeId_idx" ON "public"."Expense"("typeId");

-- CreateIndex
CREATE INDEX "Expense_supplierTypeId_idx" ON "public"."Expense"("supplierTypeId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "public"."Expense"("date");

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "public"."ExpenseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_supplierTypeId_fkey" FOREIGN KEY ("supplierTypeId") REFERENCES "public"."SupplierType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
