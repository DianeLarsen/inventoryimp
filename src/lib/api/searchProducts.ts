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
    const openFoodFactsResults = await searchOpenFoodFacts(options);

    if (openFoodFactsResults.length > 0) {
      return openFoodFactsResults;
    }
  }

  // USDA is the single source for normal typed searches.
  return searchFoodDataCentral(options);
}
