import "server-only";

import type { ManualInventoryInput, ProductResult } from "@/types";
import { searchProduct } from "@/lib/api/searchProducts";

const UPC_LOOKUP_BATCH_SIZE = 4;

function normalizeUpc(value?: string) {
  const upc = value?.trim();

  return upc && /^\d{8,14}$/.test(upc) ? upc : null;
}

async function findExactProductByUpc(upc: string) {
  const results = await searchProduct({
    query: upc,
    barcode: upc,
    limit: 1,
  });

  return results[0];
}

export async function enrichReceiptDrafts(
  drafts: ManualInventoryInput[],
): Promise<ManualInventoryInput[]> {
  const upcs = [
    ...new Set(
      drafts
        .map((item) => normalizeUpc(item.upc))
        .filter((upc): upc is string => Boolean(upc)),
    ),
  ];

  const productsByUpc = new Map<string, ProductResult>();

  for (let index = 0; index < upcs.length; index += UPC_LOOKUP_BATCH_SIZE) {
    const batch = upcs.slice(index, index + UPC_LOOKUP_BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (upc) => {
        try {
          return [upc, await findExactProductByUpc(upc)] as const;
        } catch (error) {
          console.warn(`UPC lookup failed for ${upc}:`, error);
          return [upc, undefined] as const;
        }
      }),
    );

    for (const [upc, product] of results) {
      if (product) {
        productsByUpc.set(upc, product);
      }
    }
  }

  return drafts.map((item) => {
    const upc = normalizeUpc(item.upc);
    const product = upc ? productsByUpc.get(upc) : undefined;

    if (!product) {
      return item;
    }

    return {
      ...item,
      upc: upc ?? undefined,
      name: product.name || item.name,
      brand: product.brand || item.brand,
      category: product.category || item.category,
      productSize: product.productSize || item.productSize,
      imageUrl: product.imageUrl || item.imageUrl,
    };
  });
}
