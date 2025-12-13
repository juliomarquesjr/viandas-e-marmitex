-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "weightKg" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."PreOrderItem" ADD COLUMN     "weightKg" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "pricePerKgCents" INTEGER;
