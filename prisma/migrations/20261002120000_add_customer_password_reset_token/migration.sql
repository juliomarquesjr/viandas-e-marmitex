-- CreateTable
CREATE TABLE "public"."CustomerPasswordResetToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPasswordResetToken_tokenHash_key" ON "public"."CustomerPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerPasswordResetToken_customerId_idx" ON "public"."CustomerPasswordResetToken"("customerId");

-- AddForeignKey
ALTER TABLE "public"."CustomerPasswordResetToken" ADD CONSTRAINT "CustomerPasswordResetToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

