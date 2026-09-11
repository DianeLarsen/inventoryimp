"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

export type MergedItemFields = {
  name: string;
  upc: string | null;
  brand: string | null;
  category: string | null;
  unit: string | null;
  productSize: string | null;
  quantityAvailable: string | null;
  location: string | null;
  lowThreshold: string | null;
  decrementStep: string | null;
  expiresAt: string | null; // "YYYY-MM-DD", or null to clear it
  notes: string | null;
  imageUrl: string | null;
};

function parseDecimalValue(value: string | null): string | null {
  const trimmed = value?.trim();

  if (!trimmed || !/^\d+(?:\.\d{1,3})?$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

// Consolidates two InventoryItem rows for the exact same product (matched
// by UPC on the duplicate-scan page) into one: keepItemId survives with the
// caller's chosen field values, removeItemId's purchase history and
// recipe/grocery-list links move over to it, then removeItemId itself (and
// its now-empty Product, if it isn't the one that survives) is deleted.
export async function mergeInventoryItems(
  keepItemId: string,
  removeItemId: string,
  fields: MergedItemFields,
): Promise<{ success: boolean; message?: string }> {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  if (keepItemId === removeItemId) {
    return { success: false, message: "Cannot merge an item with itself." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const [keepItem, removeItem] = await Promise.all([
        tx.inventoryItem.findFirst({ where: { id: keepItemId, userId } }),
        tx.inventoryItem.findFirst({ where: { id: removeItemId, userId } }),
      ]);

      if (!keepItem || !removeItem) {
        throw new Error("One of those items could not be found.");
      }

      const removedProductId = removeItem.productId;

      await tx.inventoryItem.update({
        where: { id: keepItemId },
        data: {
          name: fields.name,
          upc: fields.upc,
          brand: fields.brand,
          category: fields.category,
          unit: fields.unit,
          productSize: fields.productSize,
          quantityAvailable: fields.quantityAvailable,
          quantityValue: parseDecimalValue(fields.quantityAvailable),
          location: fields.location,
          lowThreshold: fields.lowThreshold,
          lowThresholdValue: parseDecimalValue(fields.lowThreshold),
          decrementStep: fields.decrementStep,
          decrementStepValue: parseDecimalValue(fields.decrementStep),
          expiresAt: fields.expiresAt
            ? new Date(`${fields.expiresAt}T12:00:00.000Z`)
            : null,
          notes: fields.notes,
          imageUrl: fields.imageUrl,
        },
      });

      // Carry over everything that referenced the item being removed.
      await tx.purchaseHistory.updateMany({
        where: { itemId: removeItemId },
        data: { itemId: keepItemId },
      });
      await tx.recipeIngredient.updateMany({
        where: { inventoryItemId: removeItemId },
        data: { inventoryItemId: keepItemId },
      });
      await tx.groceryListItem.updateMany({
        where: { inventoryItemId: removeItemId },
        data: { inventoryItemId: keepItemId },
      });

      await tx.inventoryItem.delete({ where: { id: removeItemId } });

      // Keep the surviving item's Product in sync with the merged
      // name/category/unit, so the group header matches what was chosen.
      await tx.product.update({
        where: { id: keepItem.productId },
        data: {
          name: fields.name,
          category: fields.category,
          unit: fields.unit,
        },
      });

      // Clean up the removed item's product, unless it's the same one the
      // kept item already belongs to.
      if (removedProductId !== keepItem.productId) {
        const remaining = await tx.inventoryItem.count({
          where: { productId: removedProductId },
        });

        if (remaining === 0) {
          await tx.product.delete({ where: { id: removedProductId } });
        }
      }
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/duplicates");

    return { success: true };
  } catch (error) {
    console.error("Failed to merge inventory items:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to merge items.",
    };
  }
}
