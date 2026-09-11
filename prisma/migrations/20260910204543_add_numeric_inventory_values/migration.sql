-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "decrementStepValue" DECIMAL(12,3),
ADD COLUMN     "lowThresholdValue" DECIMAL(12,3),
ADD COLUMN     "quantityValue" DECIMAL(12,3);
UPDATE "InventoryItem"
SET
  "quantityValue" = "quantityAvailable"::DECIMAL(12, 3),
  "lowThresholdValue" = "lowThreshold"::DECIMAL(12, 3),
  "decrementStepValue" = "decrementStep"::DECIMAL(12, 3),
  "unit" = CASE
    WHEN LOWER(TRIM(COALESCE("unit", ''))) = 'null' THEN NULL
    ELSE NULLIF(TRIM("unit"), '')
  END;