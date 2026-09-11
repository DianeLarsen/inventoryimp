"use server";

import prisma from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/current-user";
import { normalizeBarcode } from "@/lib/utils";
import type { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      items: {
        select: { brand: true, upc: true },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    unit: product.unit,
    itemCount: product.items.length,
    brands: [
      ...new Set(
        product.items
          .map((item) => item.brand?.trim())
          .filter((brand): brand is string => Boolean(brand)),
      ),
    ],
    upcs: [
      ...new Set(
        product.items
          .map((item) => item.upc)
          .filter((upc): upc is string => Boolean(upc))
          .map(normalizeBarcode),
      ),
    ],
  }));
}
