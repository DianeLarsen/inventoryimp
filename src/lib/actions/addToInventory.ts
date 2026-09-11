"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireCurrentUserId } from "@/lib/current-user";
import type { ManualInventoryInput } from "@/types";
import { revalidatePath } from "next/cache";

function parseDecimalValue(
  label: string,
  value: string | undefined,
): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d+(?:\.\d{1,3})?$/.test(trimmed)) {
    throw new Error(
      `${label} must be a number with up to three decimal places.`,
    );
  }

  return trimmed;
}

export async function addToInventory(item: ManualInventoryInput) {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const quantityValue = parseDecimalValue(
    "Quantity available",
    item.quantityAvailable,
  );
  const lowThresholdValue = parseDecimalValue(
    "Low-stock threshold",
    item.lowThreshold,
  );
  const decrementStepValue = parseDecimalValue(
    "Decrement step",
    item.decrementStep,
  );

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

const quantity = quantityValue ? Number(quantityValue) : Number.NaN;

 const shouldRecordPurchase =
   costCents !== null && Number.isFinite(quantity) && quantity > 0;

  const unit =
    item.unit?.trim() && item.unit.trim().toLowerCase() !== "null"
      ? item.unit.trim()
      : null;

  await prisma.$transaction(async (tx) => {
    // Link to an existing Product only after the user has confirmed it (via
    // productId); otherwise this item gets its own new Product, named after
    // itself, same as every other product-grouping entry point.
    let productId = item.productId;

    if (productId) {
      const product = await tx.product.findFirst({
        where: { id: productId, userId },
      });

      if (!product) {
        throw new Error("That product could not be found.");
      }
    } else {
      const product = await tx.product.create({
        data: {
          userId,
          name: item.name,
          category: item.category || null,
          unit,
        },
      });

      productId = product.id;
    }

    await tx.inventoryItem.create({
      data: {
        userId,
        productId,
        upc: item.upc || null,
        name: item.name,
        category: item.category || null,
        brand: item.brand || null,
        productSize: item.productSize || null,
        quantityAvailable: item.quantityAvailable || null,
        quantityValue,
        unit,
        location: item.location || null,
        expiresAt: item.expiresAt
          ? new Date(`${item.expiresAt}T12:00:00.000Z`)
          : null,
        notes: item.notes || null,
        lowThreshold: item.lowThreshold || null,
        lowThresholdValue,
        imageUrl: item.imageUrl || null,
        decrementStep: item.decrementStep || null,
        decrementStepValue,
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
  });

  revalidatePath("/inventory");
}
