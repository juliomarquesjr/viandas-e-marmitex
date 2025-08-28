-- Criar o tipo enum PaymentMethod
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'credit', 'debit', 'pix', 'invoice', 'ficha_payment');

-- Alterar a coluna paymentMethod para usar o tipo enum
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";