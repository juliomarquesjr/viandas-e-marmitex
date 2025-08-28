-- Adicionar coluna para vincular pagamentos de ficha às vendas originais
ALTER TABLE "Order" ADD COLUMN "fichaPaymentForOrderId" TEXT;

-- Adicionar chave estrangeira
ALTER TABLE "Order" ADD CONSTRAINT "Order_fichaPaymentForOrderId_fkey" 
FOREIGN KEY ("fichaPaymentForOrderId") REFERENCES "Order"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;