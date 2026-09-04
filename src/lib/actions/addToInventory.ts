'use server';

import prisma from '@/lib/prisma';
import { Prisma } from "@/generated/prisma/client";
import { requireCurrentUserId } from "@/lib/current-user";
import type { ManualInventoryInput } from '@/types';

export async function addToInventory(item: ManualInventoryInput) {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
const cost = item.cost ? Number.parseFloat(item.cost) : Number.NaN;
const quantity = item.quantityAvailable
  ? Number.parseFloat(item.quantityAvailable)
  : Number.NaN;

const shouldRecordPurchase =
  Number.isFinite(cost) &&
  cost >= 0 &&
  Number.isFinite(quantity) &&
  quantity > 0;

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
      notes: item.notes || null,
      lowThreshold: item.lowThreshold || null,
      imageUrl: item.imageUrl || null,
      decrementStep: item.decrementStep || null,
      purchaseHistory: shouldRecordPurchase
        ? {
            create: {
              cost,
              quantity,
            },
          }
        : undefined,
      nutrition: Prisma.JsonNull,
      ingredients: Prisma.JsonNull,
    },
  });
}
