// lib/actions/deleteAllInventory.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

export async function deleteAllInventory() {
  const userId = await requireCurrentUserId();

  const deletedItems = await prisma.inventoryItem.deleteMany({
    where: { userId },
  });

  revalidatePath("/inventory");

  return { success: true, deletedCount: deletedItems.count };
}