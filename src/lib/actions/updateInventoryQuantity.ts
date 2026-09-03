'use server';

// lib/actions/updateInventoryQuantity.ts

import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";

export async function updateInventoryQuantity(
  upc: string | undefined,
  name: string,
  quantityToAdd: number
): Promise<{ success: boolean; message?: string }> {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  try {
    const match = upc
      ? await prisma.inventoryItem.findFirst({
          where: {
            upc: upc || undefined,
            userId,
          },
        })
      : await prisma.inventoryItem.findFirst({
          where: {
            name: {
              equals: name,
              mode: "insensitive",
            },
            userId,
          },
        });

    if (!match) {
      return { success: false, message: "No matching item found." };
    }

    const currentQty = parseFloat(match.quantityAvailable || "0");
    const newQty = currentQty + quantityToAdd;

    await prisma.inventoryItem.update({
      where: { id: match.id },
      data: {
        quantityAvailable: newQty.toString(),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("Failed to update inventory quantity:", err);
    return { success: false, message: "Error updating inventory." };
  }
}

