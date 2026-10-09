-- CreateTable
CREATE TABLE "public"."DailyMenu" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "showOrderButton" BOOLEAN NOT NULL DEFAULT true,
    "notifyCustomers" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyMenuSection" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "DailyMenuSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyMenuItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "vegetarian" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "DailyMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMenu_date_key" ON "public"."DailyMenu"("date");

-- CreateIndex
CREATE INDEX "DailyMenu_status_date_idx" ON "public"."DailyMenu"("status", "date");

-- CreateIndex
CREATE INDEX "DailyMenuSection_menuId_position_idx" ON "public"."DailyMenuSection"("menuId", "position");

-- CreateIndex
CREATE INDEX "DailyMenuItem_sectionId_position_idx" ON "public"."DailyMenuItem"("sectionId", "position");

-- AddForeignKey
ALTER TABLE "public"."DailyMenuSection" ADD CONSTRAINT "DailyMenuSection_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "public"."DailyMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyMenuItem" ADD CONSTRAINT "DailyMenuItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."DailyMenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

