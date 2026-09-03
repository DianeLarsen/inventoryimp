interface SearchOptions {
  query: string;
  brand?: string;
  barcode?: string;
  limit?: number;
  searchType?: "branded" | "raw";
  signal?: AbortSignal;
}



export async function searchFoodDataCentral({
  query,
  brand,
  barcode,
  limit = 10,
  searchType,
  signal, // ✅ Accept it
}: SearchOptions) {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error("Missing USDA_API_KEY");

  const searchTerm = barcode ? barcode : brand && query ? `${query} ${brand}` : query;

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    searchTerm || ""
  )}&dataType=${searchType === "raw" ? "Foundation,SR Legacy" : "Branded"}&pageSize=100&api_key=${key}`;

  const res = await fetch(url, { signal }); // ✅ Use the signal here

  if (!res.ok) {
    throw new Error(`USDA fetch failed: ${res.status}`);
  }

  const data = await res.json();
    if (!data.foods || !Array.isArray(data.foods)) {
      console.warn("⚠️ Unexpected USDA response format:", data);
      return [];
    }
  
    // ✅ Barcode match filtering (strict)
    let items = data.foods;
    if (barcode) {
      items = items.filter((item: any) => item.gtinUpc === barcode);
    }
  
    // ✅ Optional brand filtering (when not barcode search)
    if (!barcode && brand) {
      items = items.filter((item: any) =>
        item.brandName?.toLowerCase().includes(brand.toLowerCase())
      );
    }
  
    if (items.length === 0) {
      console.warn("⚠️ No USDA matches after filtering.");
      return [];
    }
  
    return items.slice(0, limit).map((item: any) => ({
      upc: item.gtinUpc,
      name: item.description,
      category: item.foodCategory,
      brandOwner: item.brandOwner,
      brand: item.brandName,
      productSize: item.quantity || item.serving_size,
      imageUrl: null,
      url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${item.fdcId}/branded`,
    }));
  }
  
  