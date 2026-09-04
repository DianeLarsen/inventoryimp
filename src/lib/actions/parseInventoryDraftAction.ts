"use server";

import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  inventoryDraftSchema,
  toManualInventoryInput,
} from "@/lib/inventory-draft";
import type { ManualInventoryInput } from "@/types";
import { requireCurrentUserId } from "@/lib/current-user";
import { auth } from "@clerk/nextjs/server";

const inventoryDraftInstructions = `
Extract grocery or inventory items from the user's text.

Rules:
- Return only items explicitly present in the input.
- Do not invent UPCs, brands, package sizes, categories, costs, nutrition data,
  locations, or product facts.
- Use a decimal quantity: "half" or "1/2" becomes 0.5.
- Use the purchase/inventory unit when stated, such as "can", "bag", "box",
  "bottle", or "each". Do not treat a package size such as "16 oz" as the unit.
- Put package information such as "16 oz" or "12-count" in productSize only
  when it is stated.
- Preserve UPCs as strings, including leading zeroes.
- Set unknown fields to null.
- For receipt text, ignore totals, taxes, discounts, payment lines, dates,
  store addresses, and loyalty information.
- Preserve unclear receipt abbreviations rather than guessing.
- These are review drafts only. The user will edit and confirm them before saving.
`;

export async function parseInventoryDraftAction(
  rawText: string,
): Promise<ManualInventoryInput[]> {
  await requireCurrentUserId();

  const { has } = await auth();

  if (!has({ feature: "ai_receipt_parsing" })) {
    throw new Error(
      "AI receipt parsing requires the Home plan or an active free trial.",
    );
  }
  const text = rawText.trim();

  if (!text) {
    throw new Error("Enter grocery or receipt text to parse.");
  }

  if (text.length > 10_000) {
    throw new Error("Please paste 10,000 characters or fewer.");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.responses.parse({
    model: "gpt-5.6-luna",
    input: [
      { role: "system", content: inventoryDraftInstructions },
      { role: "user", content: text },
    ],
    text: {
      format: zodTextFormat(inventoryDraftSchema, "inventory_drafts"),
    },
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("The AI service did not return a usable inventory draft.");
  }

  return parsed.items.map(toManualInventoryInput);
}
