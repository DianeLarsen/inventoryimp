"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

export type ProductFieldOverrides = {
  name?: string;
  category?: string | null;
  unit?: string | null;
};

export type ItemFieldOverrides = {
  brand?: string | null;
  productSize?: string | null;
  quantityAvailable?: string | null;
  location?: string | null;
  lowThreshold?: string | null;
  decrementStep?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
};

function parseDecimalValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed || !/^\d+(?:\.\d{1,3})?$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

// Moves every InventoryItem off mergeProductId and onto keepProductId, then
// removes the now-empty product. Each brand's own InventoryItem row (stock,
// purchase history) is untouched by default - only which Product it belongs
// to changes.
//
// An optional `overrides` applies the caller's chosen name/category/unit to
// the surviving product, instead of leaving it as keepProduct's own
// (unedited) values. An optional `itemUpdates` applies direct edits to each
// brand's own row at the same time - e.g. fixing a quantity or filling in a
// missing location while reviewing the merge - without touching fields the
// caller didn't include.
export async function mergeProducts(
  keepProductId: string,
  mergeProductId: string,
  overrides?: ProductFieldOverrides,
  itemUpdates?: { itemId: string; fields: ItemFieldOverrides }[],
): Promise<{ success: boolean; message?: string }> {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  if (keepProductId === mergeProductId) {
    return { success: false, message: "Cannot merge a product with itself." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const [keepProduct, mergeProduct] = await Promise.all([
        tx.product.findFirst({ where: { id: keepProductId, userId } }),
        tx.product.findFirst({ where: { id: mergeProductId, userId } }),
      ]);

      if (!keepProduct || !mergeProduct) {
        throw new Error("One of those products could not be found.");
      }

      await tx.inventoryItem.updateMany({
        where: { productId: mergeProductId, userId },
        data: { productId: keepProductId },
      });

      await tx.product.delete({ where: { id: mergeProductId } });

      if (overrides) {
        await tx.product.update({
          where: { id: keepProductId },
          data: overrides,
        });
      }

      for (const update of itemUpdates ?? []) {
        const { itemId, fields } = update;
        const data: Record<string, unknown> = { ...fields };

        if ("quantityAvailable" in fields) {
          data.quantityValue = parseDecimalValue(fields.quantityAvailable);
        }
        if ("lowThreshold" in fields) {
          data.lowThresholdValue = parseDecimalValue(fields.lowThreshold);
        }

        const result = await tx.inventoryItem.updateMany({
          where: { id: itemId, userId },
          data,
        });

        if (result.count === 0) {
          throw new Error("One of those items could not be found.");
        }
      }
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/duplicates");

    return { success: true };
  } catch (error) {
    console.error("Failed to merge products:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to merge products.",
    };
  }
}
