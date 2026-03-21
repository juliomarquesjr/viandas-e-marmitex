-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "nfChaveAcesso" TEXT;

-- CreateIndex
CREATE INDEX "Expense_nfChaveAcesso_idx" ON "public"."Expense"("nfChaveAcesso");
