import { z } from "zod";

import type { ManualInventoryInput } from "@/types";

export const inventoryDraftSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: z.number().positive(),
        unit: z.string().trim().min(1).nullable(),
        productSize: z.string().trim().min(1).nullable(),
        brand: z.string().trim().min(1).nullable(),
        category: z.string().trim().min(1).nullable(),
        cost: z.number().nonnegative().nullable(),
        notes: z.string().trim().min(1).nullable(),
        upc: z.string().trim().min(1).nullable(),
      }),
    )
    .max(200),
});

export type InventoryDraft = z.infer<typeof inventoryDraftSchema>;
type InventoryDraftItem = InventoryDraft["items"][number];

export function toManualInventoryInput(
  item: InventoryDraftItem,
): ManualInventoryInput {
  return {
    name: item.name,
    upc: item.upc ?? undefined,
    brand: item.brand ?? undefined,
    category: item.category ?? undefined,
    productSize: item.productSize ?? undefined,
    quantityAvailable: String(item.quantity),
    unit: item.unit ?? undefined,
    notes: item.notes ?? undefined,
    lowThreshold: undefined,
    imageUrl: undefined,
    decrementStep: "1",
    cost: item.cost === null ? undefined : item.cost.toFixed(2),
  };
}

export function parseStructuredInventoryDraft(
  rawText: string,
): ManualInventoryInput[] {
  let json: unknown;

  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(
      "That is not valid JSON. Copy only the JSON result from your AI tool.",
    );
  }

  const result = inventoryDraftSchema.safeParse(json);

  if (!result.success) {
    throw new Error(
      "The receipt JSON is missing required fields or has an invalid item.",
    );
  }

  return result.data.items.map(toManualInventoryInput);
}

export const BYO_AI_RECEIPT_PROMPT = `Convert the following grocery receipt or order confirmation into JSON for an inventory app.

Return JSON only. Do not use Markdown or explain anything.

Use exactly this shape:

{
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit": "string or null",
      "productSize": "string or null",
      "brand": "string or null",
      "category": "string or null",
      "cost": 0,
      "notes": "string or null",
      "upc": "string or null"
    }
  ]
}

Rules:
- Include only purchased grocery or household inventory items.
- Ignore order totals, sales tax, discounts, fees, payment details, loyalty information, addresses, dates, and order numbers.
- Preserve UPCs as strings, including leading zeroes.
- quantity must be a positive number.
- For multipacks, use the number purchased as quantity and preserve package details in productSize.
- For weighted produce, use the billed weight and unit "lb" only when a count or package unit is not clearly stated. Otherwise use the stated count/unit.
- cost is the final total paid for that item line after any item-level discount.
- Do not invent brands, categories, package sizes, UPCs, or notes. Use null when unknown.
- Do not add any text before or after the JSON.

Receipt:
[paste receipt here]`;
