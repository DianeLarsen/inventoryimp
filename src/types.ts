// src/types.ts

export type InventoryItem = {
  id: string;
  upc?: string | null;
  name: string;
  brand?: string | null;
  category?: string | null;
  quantityAvailable?: string | null; // e.g., "1/2"
  productSize?: string | null; // e.g., "32oz bag"
  unit?: string | null; // e.g., "bag"
  location?: string | null;
  notes?: string | null;
  lowThreshold?: string | null;
  expiresAt?: string | null;
  imageUrl?: string | null;
  addedAt?: string; // ISO strings if fetched from JSON/REST
  updatedAt?: string;
  userId?: string;
  decrementStep?: string | null;
  cost?: string;
  quantityValue?: string | null;
  lowThresholdValue?: string | null;
  decrementStepValue?: string | null;
  productId?: string;
  productName?: string;
};

// A Product groups multiple brand-specific InventoryItem rows together
// (e.g. Great Value and Campbell's chicken noodle soup, both "Chicken
// Noodle Soup") so they can be shown as one thing while each brand keeps
// its own stock and purchase history.
export type Product = {
  id: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  brands: string[]; // distinct, non-empty brands already stocked under this product
  itemCount: number;
};

export type ProductResult = {
  upc: string;
  name: string;
  category?: string;
  brandOwner?: string;
  brand?: string;
  productSize?: string; // e.g. "32oz box"
  quantityAvailable?: string; // e.g. "1/2"
  imageUrl?: string;
  url?: string;
};

export type ManualInventoryInput = {
  upc?: string;
  name: string;
  brand?: string;
  category?: string;
  productSize?: string;
  quantityAvailable?: string;
  unit?: string;
  location?: string;
  notes?: string;
  lowThreshold?: string;
  expiresAt?: string;
  imageUrl?: string;
  decrementStep: string;
  cost?: string;
  // Set when the user confirmed this item belongs to an existing Product
  // (e.g. linking a new brand to an already-tracked product). Left unset
  // to create a new Product named after this item.
  productId?: string;
};

export type SelectOption = { value: string; label: string };

export type ParsedReceiptItem = {
  name: string;
  productSize?: string;
  quantity: number;
  cost: number;
  unit?: string;
  notes?: string;
  upc?: string;
};
