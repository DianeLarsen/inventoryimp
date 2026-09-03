"use server";

import { revalidatePath } from "next/cache";
import type { InventoryItem } from "@/types";
import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

export async function updateItemQuantity(id: string, newQuantity: string) {
  try {
    const userId = await requireCurrentUserId();

    const result = await prisma.inventoryItem.updateMany({
      where: { id, userId },
      data: { quantityAvailable: newQuantity },
    });

    if (result.count === 0) {
      return { success: false, message: "Inventory item not found." };
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false, message: "Failed to update quantity." };
  }
}

export async function updateInventoryItem(item: InventoryItem) {
  try {
    const userId = await requireCurrentUserId();

    const result = await prisma.inventoryItem.updateMany({
      where: { id: item.id, userId },
      data: {
        name: item.name,
        brand: item.brand,
        category: item.category,
        quantityAvailable: item.quantityAvailable,
        productSize: item.productSize,
        unit: item.unit,
        location: item.location,
        notes: item.notes,
        lowThreshold: item.lowThreshold,
        imageUrl: item.imageUrl,
      },
    });

    if (result.count === 0) {
      return { success: false, message: "Inventory item not found." };
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error updating item:", error);
    return { success: false, message: "Failed to update item." };
  }
}
