// lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  DuplicateCandidate,
  InventoryItem,
  ManualInventoryInput,
  ParsedReceiptItem,
  Product,
} from "@/types";
import { deleteAllInventory } from "./actions/deleteAllInventory";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const requiredFields: (keyof ManualInventoryInput)[] = [
  "name",
  "category",
  "productSize",
  "quantityAvailable",
  "unit",
  "location",
  "notes",
  "lowThreshold",
  "decrementStep",
];

export function hasMissingFields(item: Partial<ManualInventoryInput>): boolean {
  return requiredFields.some(
    (field) => !item[field] || item[field]?.toString().trim() === "",
  );
}

export function guessDecrementStep(
  productSize?: string | null,
  unit?: string | null,
): string {
  if (!productSize || !unit) return "1";

  const sizeMatch = productSize.match(/([\d.]+)/);
  const sizeValue = sizeMatch ? parseFloat(sizeMatch[1]) : 1;

  if (
    unit.toLowerCase().includes("oz") ||
    productSize.toLowerCase().includes("oz")
  ) {
    return Math.max(0.1, sizeValue / 10).toFixed(1);
  }

  if (
    unit.toLowerCase().includes("ml") ||
    productSize.toLowerCase().includes("ml")
  ) {
    return Math.max(1, sizeValue / 100).toFixed(1);
  }

  if (productSize.toLowerCase().includes("count")) {
    return "1";
  }

  return "1";
}

export function normalizeToManualInput(
  data: Partial<InventoryItem>,
): ManualInventoryInput {
  return {
    name: data.name ?? "Unnamed Item", // or throw an error if this is unacceptable
    upc: data.upc ?? undefined,
    brand: data.brand ?? "",
    category: data.category ?? "",
    productSize: data.productSize ?? "",
    quantityAvailable: data.quantityAvailable ?? "",
    unit: data.unit ?? "",
    location: data.location ?? "",
    notes: data.notes ?? "",
    lowThreshold: data.lowThreshold ?? "",
    imageUrl: data.imageUrl ?? "",
    decrementStep: data.decrementStep ?? "1",
    cost: data.cost ?? "",
  };
}

function parseFredMeyerReceipt(text: string): ParsedReceiptItem[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const items: ParsedReceiptItem[] = [];

  let current: ParsedReceiptItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Item name line (starts a new item)
    if (
      line.match(
        /^(.*?),\s*\d+(\.\d+)?\s?(oz|lb|g|kg|ct|pack|dozen|ml|L|fl oz)$/i,
      )
    ) {
      // Push previous item if exists
      if (current) items.push(current);

      const match = line.match(
        /^(.*?),\s*(\d+(\.\d+)?\s?(oz|lb|g|kg|ct|pack|dozen|ml|L|fl oz))$/i,
      );
      current = {
        name: match?.[1].trim() || line,
        productSize: match?.[2]?.trim() || "",
        quantity: 1,
        cost: 0,
        unit: "each",
        notes: "",
        upc: "",
      };
    } else if (!current) {
      continue; // Skip lines until we hit a name line
    } else {
      // $ Cost line
      const costMatch = line.match(/^\$(\d+(\.\d{2})?)$/);
      if (costMatch) {
        current.cost = parseFloat(costMatch[1]);
      }

      // Quantity line: 2 x $2.99 each or 1.86 lbs x $1.98
      const qtyMatch = line.match(/^([\d.]+)\s*(lbs|x)\s*\$([\d.]+)/i);
      if (qtyMatch) {
        current.quantity = parseFloat(qtyMatch[1]);
        current.unit = qtyMatch[2] === "lbs" ? "lb" : "each";
      }

      // Notes (sale/coupon)
      if (
        line.toLowerCase().includes("coupon") ||
        line.toLowerCase().includes("sale")
      ) {
        current.notes += current.notes ? `; ${line}` : line;
      }

      // UPC
      const upcMatch = line.match(/^UPC:\s*(\d{12,13})/i);
      if (upcMatch) {
        current.upc = upcMatch[1];
      }
    }
  }

  if (current) items.push(current); // Add last item

  return items;
}

export function parseWalmartReceipt(text: string): ParsedReceiptItem[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const items: ParsedReceiptItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const name = lines[i];
    const qtyLine = lines[i + 1]?.match(/^Qty:\s*([\d.]+)/);
    const priceLine = lines[i + 2]?.match(
      /^\$(\d+(\.\d{2})?)\s*\$(\d+(\.\d{2})?)?/,
    );

    if (qtyLine && priceLine) {
      const quantity = parseFloat(qtyLine[1]);
      const totalPrice = parseFloat(priceLine[1]);
      const cost = priceLine[3]
        ? parseFloat(priceLine[3])
        : totalPrice / quantity;

      items.push({
        name,
        quantity,
        cost,
        upc: undefined, // Walmart often doesn't include UPC in plain text receipts
      });

      i += 2;
    } else if (lines[i + 1]?.startsWith("$")) {
      // Simple item line: name + price
      const priceMatch = lines[i + 1].match(/^\$(\d+(\.\d{2})?)/);
      if (priceMatch) {
        const totalPrice = parseFloat(priceMatch[1]);
        items.push({
          name,
          quantity: 1,
          cost: totalPrice,
          upc: undefined,
        });
        i += 1;
      }
    }
  }

  return items;
}

export function parseSafewayReceipt(text: string): ParsedReceiptItem[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const items: ParsedReceiptItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const name = lines[i];
    const qtyLine = lines[i + 1]?.match(/^(\d+)\s+@\s+\$(\d+(\.\d{2})?)/);
    const totalLine = lines[i + 2]?.match(/^Total:\s*\$(\d+(\.\d{2})?)/);
    const upcLine = lines[i + 3]?.match(/^UPC:\s*(\d{12,13})/);

    if (qtyLine && totalLine) {
      const quantity = parseInt(qtyLine[1]);
      const cost = parseFloat(qtyLine[2]);
      const upc = upcLine ? upcLine[1] : undefined;

      items.push({
        name,
        quantity,
        cost,
        upc,
      });

      i += upc ? 4 : 3;
    }
  }

  return items;
}

export function parseReceiptText(
  text: string,
  store: string,
): ParsedReceiptItem[] {
  if (store === "fredmeyer") return parseFredMeyerReceipt(text);
  if (store === "walmart") return parseWalmartReceipt(text);
  if (store === "safeway") return parseSafewayReceipt(text);
  return [];
}

export function convertParsedToManual(
  parsed: ParsedReceiptItem,
  existingInventory: InventoryItem[],
): ManualInventoryInput {
  const matched = parsed.upc
    ? existingInventory.find((item) => item.upc === parsed.upc)
    : existingInventory.find(
        (item) => item.name.toLowerCase() === parsed.name.toLowerCase(),
      );
  // console.log("preconverted", parsed)
  return {
    name: parsed.name,
    upc: parsed.upc,
    brand: matched?.brand ?? "",
    category: matched?.category ?? "",
    productSize: parsed?.productSize ?? "",
    quantityAvailable: parsed.quantity.toString(),
    unit: matched?.unit ?? "unit",
    location: matched?.location ?? "",
    lowThreshold: matched?.lowThreshold ?? "1",
    imageUrl: matched?.imageUrl ?? "",
    decrementStep:
      matched?.decrementStep ??
      guessDecrementStep(matched?.productSize, matched?.unit),
    cost: parsed.cost.toFixed(2),
  };
}

function normalize(str: string) {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function findMatchingInventoryItem(
  incoming: ManualInventoryInput,
  inventory: InventoryItem[],
): { match?: InventoryItem; reason?: string } {
  if (incoming.upc) {
    const match = inventory.find(
      (item) => item.upc?.toString().trim() === incoming.upc?.toString().trim(),
    );
    if (match) return { match };
  }

  const matchByName = inventory.find(
    (item) => normalize(item.name) === normalize(incoming.name),
  );

  if (matchByName) return { match: matchByName };

  return {};
}

function normalizeWords(str: string): string[] {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Word-overlap (Jaccard) similarity, 0-1. Deliberately simple and
// dependency-free: it's meant to *suggest* a possible match for a human to
// confirm, never to merge products on its own. This is why two items whose
// name differs only by brand ("Great Value Chicken Noodle Soup" vs
// "Campbell's Chicken Noodle Soup") still score highly - the shared words
// ("chicken", "noodle", "soup") dominate even though the brand words don't
// match at all.
export function nameSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeWords(a));
  const tokensB = new Set(normalizeWords(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;

  return union === 0 ? 0 : intersection / union;
}

const PRODUCT_MATCH_THRESHOLD = 0.5;

// Suggests an existing Product this new item might belong to, based on
// name (and a small boost for a matching category). Always a suggestion
// for the user to confirm or dismiss - never applied automatically.
export function findSimilarProduct(
  name: string,
  category: string | null | undefined,
  products: Product[],
): Product | undefined {
  let best: { product: Product; score: number } | undefined;

  for (const product of products) {
    let score = nameSimilarity(name, product.name);

    if (category && product.category && normalize(category) === normalize(product.category)) {
      score += 0.1;
    }

    if (!best || score > best.score) {
      best = { product, score };
    }
  }

  return best && best.score >= PRODUCT_MATCH_THRESHOLD ? best.product : undefined;
}

// Same bar used for the add-time merge suggestion, so "possible duplicate"
// means the same thing whether it's caught as you scan or found later on
// the duplicate-products scan.
const DUPLICATE_MATCH_THRESHOLD = PRODUCT_MATCH_THRESHOLD;

// Pairwise scan for products that were created separately but are probably
// the same thing under different brands or listings - the retroactive
// counterpart to findSimilarProduct, which only catches this going forward.
export function findDuplicateProductPairs(
  products: Product[],
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const score = nameSimilarity(products[i].name, products[j].name);

      if (score >= DUPLICATE_MATCH_THRESHOLD) {
        candidates.push({
          productA: products[i],
          productB: products[j],
          score,
        });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export function isProductSizeCompatible(
  a?: string | null,
  b?: string | null,
): boolean {
  if (!a || !b) return true;
  const unitA = a.replace(/[\d\s.]/g, "").toLowerCase();
  const unitB = b.replace(/[\d\s.]/g, "").toLowerCase();
  return unitA === unitB;
}

export async function handleDeleteAll() {
  return await deleteAllInventory();
}
