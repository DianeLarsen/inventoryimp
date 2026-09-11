UPDATE "PurchaseHistory"
SET "costCents" = ROUND("cost" * 100)::INTEGER
WHERE "costCents" IS NULL;