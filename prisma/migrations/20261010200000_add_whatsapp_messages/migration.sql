-- CreateTable
CREATE TABLE "public"."WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "customerId" TEXT,
    "number" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT,
    "systemType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "sentByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_externalId_key" ON "public"."WhatsAppMessage"("externalId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_customerId_createdAt_idx" ON "public"."WhatsAppMessage"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_number_createdAt_idx" ON "public"."WhatsAppMessage"("number", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_fromMe_readAt_idx" ON "public"."WhatsAppMessage"("fromMe", "readAt");

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

