'use server'

import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

export async function getInventory() {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const items = await prisma.inventoryItem.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return items.map((item) => ({
    ...item,
    addedAt: item.addedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    decrementStep: item.decrementStep ?? undefined,
  }));
}
