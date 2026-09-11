"use server";

import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";
import type { InventoryItem } from "@/types";

// The individual InventoryItem rows under one Product - used by the merge
// review UI, which needs the actual field values (not just the aggregated
// brands/itemCount a Product carries).
export async function getProductItems(productId: string): Promise<InventoryItem[]> {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const items = await prisma.inventoryItem.findMany({
    where: { productId, userId },
    orderBy: { addedAt: "asc" },
  });

  return items.map((item) => ({
    ...item,
    quantityValue: item.quantityValue?.toString() ?? null,
    lowThresholdValue: item.lowThresholdValue?.toString() ?? null,
    decrementStepValue: item.decrementStepValue?.toString() ?? null,
    expiresAt: item.expiresAt?.toISOString() ?? null,
    addedAt: item.addedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}
