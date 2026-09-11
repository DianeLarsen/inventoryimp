"use server";

import { requireCurrentUserId } from "@/lib/current-user";
import { findDuplicateProductPairs } from "@/lib/utils";
import { getProducts } from "./getProducts";
import type { DuplicateCandidate } from "@/types";

// A one-time (or run-whenever) pass over a user's existing products,
// looking for ones that were created separately but are probably the same
// thing under different brands or listings - the retroactive counterpart
// to the add-time merge suggestion, which only catches this going forward.
export async function findDuplicateProducts(): Promise<DuplicateCandidate[]> {
  const userId = await requireCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const products = await getProducts();

  return findDuplicateProductPairs(products);
}
