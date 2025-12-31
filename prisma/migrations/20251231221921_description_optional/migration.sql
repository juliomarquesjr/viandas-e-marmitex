/*
  Warnings:

  - Made the column `description` on table `Expense` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Expense" ALTER COLUMN "description" SET NOT NULL;
