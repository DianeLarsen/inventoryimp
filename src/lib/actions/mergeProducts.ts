"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

// Moves every InventoryItem off mergeProductId and onto keepProductId, then
// removes the now-empty product. Each brand's own InventoryItem row (stock,
// purchase history) is untouched - only which Product it belongs to changes.
export async function mergeProducts(
  keepProductId: string,
  mergeProductId: string,
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
