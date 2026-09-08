"use server";

import { auth } from "@clerk/nextjs/server";
import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  inventoryDraftSchema,
  toManualInventoryInput,
} from "@/lib/inventory-draft";
import {
  releaseAiReceiptParse,
  reserveAiReceiptParse,
} from "@/lib/ai-receipt-usage";
import { requireCurrentUserId } from "@/lib/current-user";
import type { ManualInventoryInput } from "@/types";
import { enrichReceiptDrafts } from "@/lib/enrich-receipt-drafts";

const MAX_RECEIPT_IMAGE_BYTES = 4 * 1024 * 1024;

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const receiptImageInstructions = `
Extract grocery or household inventory items from this receipt image.

Rules:
- Return only items clearly visible on the receipt.
- Ignore totals, taxes, discounts, fees, payment details, loyalty information,
  store addresses, dates, order numbers, and card details.
- Do not invent UPCs, brands, package sizes, categories, costs, or quantities.
- Preserve a visible UPC as a string, including leading zeroes.
- quantity must be a positive number.
- Use a package/count unit when it is visible. Use pounds only when the receipt
  clearly sells the item by weight and does not state a more useful count.
- cost is the final total paid for that item line after item-level discounts.
- Set unknown fields to null.
- These are review drafts only. The user will edit and confirm them before saving.
`;

export async function parseReceiptImageAction(
  formData: FormData,
): Promise<ManualInventoryInput[]> {
  const userId = await requireCurrentUserId();

  const { has } = await auth();

  if (!has({ feature: "ai_receipt_parsing" })) {
    throw new Error(
      "Receipt scanning requires the Home plan or an active free trial.",
    );
  }

  const image = formData.get("receipt");

  if (!(image instanceof File) || image.size === 0) {
    throw new Error("Choose a receipt image first.");
  }

  if (!allowedImageTypes.has(image.type)) {
    throw new Error("Use a JPG, PNG, or WebP receipt image.");
  }

  if (image.size > MAX_RECEIPT_IMAGE_BYTES) {
    throw new Error("Receipt images must be 4 MB or smaller.");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const reservation = await reserveAiReceiptParse(userId);

  try {
    const imageBase64 = Buffer.from(await image.arrayBuffer()).toString(
      "base64",
    );

    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.parse({
      model: "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: receiptImageInstructions,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Read this receipt image and return inventory review drafts.",
            },
            {
              type: "input_image",
              image_url: `data:${image.type};base64,${imageBase64}`,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(inventoryDraftSchema, "inventory_drafts"),
      },
    });

    const parsed = response.output_parsed;

    if (!parsed || parsed.items.length === 0) {
      throw new Error("The receipt image did not contain any inventory items.");
    }

    return enrichReceiptDrafts(parsed.items.map(toManualInventoryInput));
  } catch (error) {
    await releaseAiReceiptParse(userId, reservation);
    throw error;
  }
}
