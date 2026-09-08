"use server";

import { requireCurrentUserId } from "@/lib/current-user";
import { enrichReceiptDrafts } from "@/lib/enrich-receipt-drafts";
import type { ManualInventoryInput } from "@/types";

export async function enrichReceiptDraftsAction(
  drafts: ManualInventoryInput[],
) {
  await requireCurrentUserId();

  if (!Array.isArray(drafts) || drafts.length > 200) {
    throw new Error("Import up to 200 receipt items at a time.");
  }

  return enrichReceiptDrafts(drafts);
}
