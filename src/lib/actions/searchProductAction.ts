"use server";

import { searchProduct } from "@/lib/api/searchProducts";
import { requireCurrentUserId } from "@/lib/current-user";

const DEFAULT_RESULT_LIMIT = 10;
const MAX_RESULT_LIMIT = 25;

function getResultLimit(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(value?.toString() ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_RESULT_LIMIT;
  }

  return Math.min(Math.max(parsed, 1), MAX_RESULT_LIMIT);
}

export async function searchProductAction(formData: FormData) {
  await requireCurrentUserId();

  const query = formData.get("query")?.toString() || "";
  const brand = formData.get("brand")?.toString() || "";
  const barcode = formData.get("barcode")?.toString() || "";
  const searchType = formData.get("searchType") as "branded" | "raw" | null;
  const limit = getResultLimit(formData.get("limit"));

  return searchProduct({
    query,
    brand,
    barcode,
    limit,
    searchType: searchType ?? undefined,
  });
}
