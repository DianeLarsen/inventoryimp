import { searchFoodDataCentral } from "./sources/foodDataCentral";
import { searchOpenFoodFacts } from "./sources/openFoodFacts";
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

  // Barcode data is where Open Food Facts is useful.
  // If it is unavailable or has no match, USDA gets a chance.
if (barcode) {
  for (const barcodeCandidate of getBarcodeCandidates(barcode)) {
    const lookupOptions = {
      ...options,
      query: barcodeCandidate,
      barcode: barcodeCandidate,
    };

    const openFoodFactsResults = await searchOpenFoodFacts(lookupOptions);

    if (openFoodFactsResults.length > 0) {
      return openFoodFactsResults;
    }

    const usdaResults = await searchFoodDataCentral(lookupOptions);

    if (usdaResults.length > 0) {
      return usdaResults;
    }
  }

  return [];
}

return searchFoodDataCentral(options);

  // USDA is the single source for normal typed searches.
  return searchFoodDataCentral(options);
}
