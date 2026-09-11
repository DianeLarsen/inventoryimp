/*
  Warnings:

  - Added the required column `productId` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

  This migration backfills a dedicated Product row for every existing
  InventoryItem (named after the item itself) before making productId
  required, so no existing inventory data is lost or left ungrouped.
*/

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- AlterTable (nullable for now; backfilled below, then locked to NOT NULL)
ALTER TABLE "InventoryItem" ADD COLUMN     "productId" TEXT;

-- Backfill: one Product per existing InventoryItem, named after the item.
CREATE TEMP TABLE "_product_backfill" AS
SELECT
  gen_random_uuid()::text AS "productId",
  "id" AS "itemId",
  "userId",
  "name",
  "category",
  "unit"
FROM "InventoryItem";

INSERT INTO "Product" ("id", "userId", "name", "category", "unit", "createdAt", "updatedAt")
SELECT "productId", "userId", "name", "category", "unit", now(), now()
FROM "_product_backfill";

UPDATE "InventoryItem" ii
SET "productId" = pb."productId"
FROM "_product_backfill" pb
WHERE ii."id" = pb."itemId";

DROP TABLE "_product_backfill";

-- Now that every row has a productId, make it required.
ALTER TABLE "InventoryItem" ALTER COLUMN "productId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- CreateIndex
CREATE INDEX "Product_userId_name_idx" ON "Product"("userId", "name");

-- CreateIndex
CREATE INDEX "InventoryItem_productId_idx" ON "InventoryItem"("productId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
