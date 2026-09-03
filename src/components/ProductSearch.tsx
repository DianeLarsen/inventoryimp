"use client";

import { useRef, useState } from "react";
import { searchProductAction } from "@/lib/actions/searchProductAction";
import Link from "next/link";
// import Select from "react-select";
import { addToInventory } from "@/lib/actions/addToInventory";
import { getInventory } from "@/lib/actions/getInventory";
import type {
  ProductResult,
  InventoryItem,
  ManualInventoryInput,
} from "@/types";
import TypedSelect, { SelectOption } from "@/components/TypedSelect";
import InventoryList from "./InventoryList";
import InventoryFormModal from "./InventoryFormModal";
import {
  guessDecrementStep,
  hasMissingFields,
  normalizeToManualInput,
} from "@/lib/utils";

export default function ProductSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[] | null>(null);
  const [availableBrands, setAvailableBrands] = useState<
    { value: string; label: string }[]
  >([]);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const activeRequestId = useRef<number>(0);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [searchType, setSearchType] = useState<"branded" | "raw">("branded");
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [limit, setLimit] = useState(10);
  const [existingInventory, setExistingInventory] = useState<InventoryItem[]>(
    [],
  );
  const [showManualForm, setShowManualForm] = useState(false);
  const [modalItem, setModalItem] = useState<Partial<InventoryItem> | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const matchingInventory = await getMatchingInventory(query);

    const requestId = activeRequestId.current + 1;
    activeRequestId.current = requestId;
    setLoading(true);

    const formData = new FormData();
    formData.append("query", query);
    formData.append("barcode", barcode);
    formData.append("limit", limit.toString());
    formData.append("searchType", searchType);

    const data = await searchProductAction(formData);

    if (requestId === activeRequestId.current) {
      const existingUpcs = new Set(matchingInventory.map((item) => item.upc));

      const filteredResults = data.filter(
        (item) => !existingUpcs.has(item.upc || ""),
      );

      setResults(filteredResults);

      const uniqueBrands = Array.from(
        new Set(data.map((item) => item.brand?.trim()).filter(Boolean)),
      );
      const formattedBrands = uniqueBrands.map((b) => ({
        value: b,
        label: b,
      }));
      setAvailableBrands(formattedBrands);
      setSelectedBrand("");
    } else {
      console.log("⚠️ Ignoring stale search result");
    }

    setLoading(false);
  };

  const handleAddToInventory = async (item: ProductResult) => {
    const enrichedItem: ManualInventoryInput = {
      name: item.name,
      upc: item.upc,
      brand: item.brand ?? "",
      category: item.category ?? "",
      productSize: item.productSize ?? "",
      quantityAvailable: item.quantityAvailable ?? "",
      unit: "", // let user fill this in
      location: "",
      notes: "",
      lowThreshold: "",
      imageUrl: item.imageUrl ?? "",
      decrementStep: guessDecrementStep(item.productSize, ""),
    };

    if (hasMissingFields(enrichedItem)) {
      setModalItem(enrichedItem); // pre-fill form
      setShowManualForm(true);
    } else {
      try {
        await addToInventory(enrichedItem);
        setAddedItems((prev) => new Set(prev).add(item.upc || item.name));
      } catch (err) {
        console.error("❌ Failed to add to inventory:", err);
      }
    }
  };

  const cancelSearch = () => {
    activeRequestId.current = -1;
    setResults(null);
    setLoading(false);
  };
  const getMatchingInventory = async (query: string) => {
    const inventory = await getInventory();
    const lowerQuery = query.toLowerCase().trim();
    const matched = inventory
      .filter((item: any) => {
        const haystack = [
          item.name,
          item.brand,
          item.category,
          item.notes,
          item.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(lowerQuery);
      })
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        brand: item.brand || null,
        category: item.category || null,
        quantityAvailable: item.quantityAvailable || null,
        unit: item.unit || null,
        location: item.location || null,
        productSize: item.productSize || null,
        imageUrl: item.imageUrl || null,
        notes: item.notes || null,
        lowThreshold: item.lowThreshold || null,
        upc: item.barcode || "",
        // Include any other required InventoryItem fields
      }));

    setExistingInventory(matched);
    return matched;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 🔍 Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or description"
            className="border p-2 rounded w-full"
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as "raw" | "branded")}
            className="border p-2 rounded"
          >
            <option value="branded">Branded</option>
            <option value="raw">Raw Ingredient</option>
          </select>
          <input
            type="text"
            name="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode (optional)"
            className="border p-2 rounded w-full md:w-1/3"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <label htmlFor="limit" className="text-sm">
            Results per page:
          </label>
          <select
            id="limit"
            name="limit"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="border p-2 rounded"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={100}>100</option>
          </select>

          {/* Brand Filter */}
          {results && availableBrands.length > 0 && (
            <div className="relative w-full md:w-1/3" suppressHydrationWarning>
              <TypedSelect
                instanceId="brand-select"
                options={availableBrands}
                value={
                  availableBrands.find((b) => b.value === selectedBrand) || null
                }
                onChange={(selectedOption: SelectOption | null) => {
                  setSelectedBrand(selectedOption?.value || "");
                }}
                isClearable
                placeholder="Select a brand..."
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                    borderColor: "hsl(var(--border))",
                    boxShadow: "none",
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.3)",
                    border: "1px solid hsl(var(--border))",
                  }),
                  option: (base, { isFocused, isSelected }) => ({
                    ...base,
                    backgroundColor: isSelected
                      ? "hsl(var(--primary))"
                      : isFocused
                        ? "hsl(var(--muted))"
                        : "hsl(var(--background))",
                    color: isSelected
                      ? "hsl(var(--primary-foreground))"
                      : "hsl(var(--foreground))",
                    cursor: "pointer",
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: "hsl(var(--foreground))",
                  }),
                  input: (base) => ({
                    ...base,
                    color: "hsl(var(--foreground))",
                  }),
                }}
              />
              {selectedBrand && (
                <button
                  onClick={() => setSelectedBrand("")}
                  className="ml-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear brand filter
                </button>
              )}
            </div>
          )}

          {/* Search Buttons */}
          <button
            type="submit"
            disabled={loading}
            className="ml-auto bg-primary text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Searching...
              </>
            ) : (
              "Search"
            )}
          </button>
          {loading && (
            <button
              type="button"
              onClick={cancelSearch}
              className="bg-muted text-foreground px-4 py-2 rounded border border-border hover:bg-muted/70 transition"
            >
              Cancel Search
            </button>
          )}
        </div>
      </form>

      {/* 🔍 Matching Inventory Section */}
      {existingInventory.length > 0 && (
        <section className="mt-8 border-2 border-primary rounded-lg p-4 bg-muted/20 shadow-sm">
          <h2 className="text-xl font-semibold text-primary mb-4">
            🔎 Already in Your Inventory
          </h2>
          <InventoryList initialItems={existingInventory} />
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <p className="text-orange-500 font-medium">🔍 Searching...</p>
      )}

      {/* 📦 New Search Results Section */}
      {results && results.length > 0 && (
        <section className="mt-12 border-t-4 border-dashed border-muted pt-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            🆕 New Items You Can Add
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            Showing{" "}
            {Math.min(
              limit,
              results.filter((item) =>
                selectedBrand
                  ? item.brand?.toLowerCase() === selectedBrand.toLowerCase()
                  : true,
              ).length,
            )}{" "}
            of {results.length} total results
          </p>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="min-w-full table-auto bg-background">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 border">UPC</th>
                  <th className="p-2 border">Description</th>
                  <th className="p-2 border">Category</th>
                  <th className="p-2 border">Brand Owner</th>
                  <th className="p-2 border">Brand</th>
                  <th className="p-2 border">Size</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {results
                  .filter((item) =>
                    selectedBrand
                      ? item.brand?.toLowerCase() ===
                        selectedBrand.toLowerCase()
                      : true,
                  )
                  .slice(0, limit)
                  .map((item, index) => (
                    <tr
                      key={item.upc || `${item.name}-${index}`}
                      className="hover:bg-muted/50"
                    >
                      <td className="p-2 border">{item.upc}</td>
                      <td className="p-2 border">
                        {item.url ? (
                          <Link
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="p-2 border">{item.category}</td>
                      <td className="p-2 border">{item.brandOwner}</td>
                      <td className="p-2 border">{item.brand}</td>
                      <td className="p-2 border">{item.productSize || "—"}</td>
                      <td className="p-2 border">
                        {addedItems.has(item.upc || item.name) ? (
                          <span className="text-green-700 font-semibold">
                            ✓ Added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddToInventory(item)}
                            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            + Add
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {showManualForm && modalItem && (
        <InventoryFormModal
          initialItem={modalItem}
          onSave={async (data) => {
            if (!data.name) {
              console.error("❌ Item name is required.");
              return;
            }

            const cleaned = normalizeToManualInput(data);

            await addToInventory(cleaned);

            setAddedItems((prev) =>
              new Set(prev).add(cleaned.upc || cleaned.name || ""),
            );
            setShowManualForm(false);
          }}
          onClose={() => setShowManualForm(false)}
          title="📝 Complete Item Details"
          isSaving={false}
        />
      )}

      {/* ❌ No Results Found */}
      {!loading && results && results.length === 0 && (
        <p className="text-center text-orange-500 font-medium mt-4">
          No results found. Please check your spelling and try again.
        </p>
      )}
    </div>
  );
}
