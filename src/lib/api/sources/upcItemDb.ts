interface SearchOptions {
  barcode?: string;
  limit?: number;
}

// UPCitemdb's free "Explorer" plan needs no signup or API key - just the
// trial endpoint. It's a general-merchandise database (not food-only), so
// it's used as the last fallback for barcode lookups: it catches non-food
// UPCs (household items, etc.) that Open Food Facts and USDA can't, and it
// always returns a dedicated brand field even when the other sources don't.
export async function searchUpcItemDb({ barcode, limit = 10 }: SearchOptions) {
  if (!barcode) return [];

  try {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
      barcode,
    )}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`❌ UPCitemdb error ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();

    if (data.code !== "OK" || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.slice(0, limit).map((item: any) => ({
      upc: item.upc || item.ean || barcode,
      name: item.title,
      category: item.category,
      brandOwner: null,
      brand: item.brand,
      productSize: item.size,
      imageUrl: item.images?.[0],
      url: `https://www.upcitemdb.com/upc/${item.upc || barcode}`,
    }));
  } catch (err) {
    console.error("UPCitemdb lookup failed:", err);
    return [];
  }
}
