'use server'

import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

export async function getInventory() {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const inventory = await prisma.inventoryItem.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return inventory.map((item) => ({
    ...item,
    quantityValue: item.quantityValue?.toString() ?? null,
    lowThresholdValue: item.lowThresholdValue?.toString() ?? null,
    decrementStepValue: item.decrementStepValue?.toString() ?? null,
    expiresAt: item.expiresAt?.toISOString() ?? null,
    addedAt: item.addedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}
