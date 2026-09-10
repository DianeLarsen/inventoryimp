"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireCurrentUserId } from "@/lib/current-user";
import type { ManualInventoryInput } from "@/types";
import { revalidatePath } from "next/cache";

export async function addToInventory(item: ManualInventoryInput) {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
 function parseCostCents(value: string | undefined) {
   const trimmed = value?.trim();

   if (!trimmed || !/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
     return null;
   }

   const [dollars, cents = ""] = trimmed.split(".");

   return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
 }

 const costCents = parseCostCents(item.cost);
 const cost = costCents === null ? Number.NaN : costCents / 100;

 const quantity = item.quantityAvailable
   ? Number.parseFloat(item.quantityAvailable)
   : Number.NaN;

 const shouldRecordPurchase =
   costCents !== null && Number.isFinite(quantity) && quantity > 0;

  await prisma.inventoryItem.create({
    data: {
      userId,
      upc: item.upc || null,
      name: item.name,
      category: item.category || null,
      brand: item.brand || null,
      productSize: item.productSize || null,
      quantityAvailable: item.quantityAvailable || null,
      unit: item.unit || null,
      location: item.location || null,
      expiresAt: item.expiresAt
        ? new Date(`${item.expiresAt}T12:00:00.000Z`)
        : null,
      notes: item.notes || null,
      lowThreshold: item.lowThreshold || null,
      imageUrl: item.imageUrl || null,
      decrementStep: item.decrementStep || null,
      purchaseHistory: shouldRecordPurchase
        ? {
            create: {
              cost,
              costCents,
              quantity,
            },
          }
        : undefined,
      nutrition: Prisma.JsonNull,
      ingredients: Prisma.JsonNull,
    },
  });
  revalidatePath("/inventory");
}
