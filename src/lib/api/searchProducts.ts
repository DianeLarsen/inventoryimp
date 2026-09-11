import { searchFoodDataCentral } from "./sources/foodDataCentral";
import { searchOpenFoodFacts } from "./sources/openFoodFacts";
import { searchUpcItemDb } from "./sources/upcItemDb";
import type { ProductResult } from "@/types";

interface SearchOptions {
  query: string;
  brand?: string;
  barcode?: string;
  limit?: number;
  searchType?: "branded" | "raw";
}

function getBarcodeCandidates(value: string) {
  const barcode = value.replace(/\D/g, "");

  if (!/^\d{8,14}$/.test(barcode)) {
    return [];
  }

  // Preserve complete UPC/EAN values exactly as entered.
  if (barcode.length !== 10 && barcode.length !== 11) {
    return [barcode];
  }

  const zerosNeeded = 12 - barcode.length;

  // Try every leading/trailing zero combination that creates a UPC-A length.
  return Array.from(
    { length: zerosNeeded + 1 },
    (_, leadingZeros) =>
      `${"0".repeat(leadingZeros)}${barcode}${"0".repeat(
        zerosNeeded - leadingZeros,
      )}`,
  );
}

// Unlike the other sources, this one throws instead of returning [] on
// failure (missing key, network error) - normalized here so a USDA failure
// never blocks the sources tried after it.
async function tryFoodDataCentral(
  lookupOptions: SearchOptions,
): Promise<ProductResult[]> {
  return searchFoodDataCentral(lookupOptions).catch((err) => {
    console.error("USDA lookup failed:", err);
    return [];
  });
}

// A match is only "complete" enough to stop searching on if the name says
// more than just the brand (a bare "Crystal Light" with no flavor isn't
// specific enough - "Crystal Light Raspberry Lemonade Drink Mix" is) or it
// has a separate size field. Checking the name matters because a source can
// have a genuinely specific product title without ever filling in a
// distinct size field (its size ends up embedded in the title text instead).
function isCompleteMatch(results: ProductResult[]): boolean {
  const [first] = results;
  if (!first?.brand || !first?.name) return false;
  if (first.productSize) return true;

  const nameWithoutBrand = first.name
    .toLowerCase()
    .replace(first.brand.toLowerCase(), "")
    .trim();

  return nameWithoutBrand.length > 3;
}

// How complete a thin (non-final) match looks, so the best one seen across
// every source tried gets kept as the fallback - not just whichever source
// happened to answer first.
function matchScore(results: ProductResult[]): number {
  const [first] = results;
  if (!first) return -1;

  let score = 0;
  if (first.brand) score++;
  if (first.productSize) score++;
  if (first.category) score++;
  if (first.imageUrl) score++;
  if (first.brand && first.name?.toLowerCase() !== first.brand.toLowerCase()) {
    score++;
  }

  return score;
}

export async function searchProduct({
  query,
  brand,
  barcode,
  limit = 10,
  searchType = "branded",
}: SearchOptions): Promise<ProductResult[]> {
  const options = {
    query,
    brand,
    barcode,
    limit,
    searchType,
  };

  // Barcode data is where Open Food Facts is usually strongest, USDA next,
  // and UPCitemdb (general merchandise, not food-specific, and capped at
  // 100 free lookups/day) last - a real product still gets tried in that
  // order to conserve UPCitemdb's scarce quota. But a thin match doesn't
  // stop the search early anymore: keep it as a fallback and keep trying
  // later sources for a more complete one, only settling for the thin
  // match if nothing better turns up anywhere.
  if (barcode) {
    let fallback: ProductResult[] | null = null;

    for (const barcodeCandidate of getBarcodeCandidates(barcode)) {
      const lookupOptions = {
        ...options,
        query: barcodeCandidate,
        barcode: barcodeCandidate,
      };

      for (const search of [
        searchOpenFoodFacts,
        tryFoodDataCentral,
        searchUpcItemDb,
      ]) {
        const results = await search(lookupOptions);

        if (results.length === 0) continue;

        if (isCompleteMatch(results)) {
          return results;
        }

        if (!fallback || matchScore(results) > matchScore(fallback)) {
          fallback = results;
        }
      }
    }

    return fallback ?? [];
  }

  // USDA is the single source for normal typed searches.
  return searchFoodDataCentral(options);
}
