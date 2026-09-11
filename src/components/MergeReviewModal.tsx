"use client";

import { useState } from "react";
import {
  mergeInventoryItems,
  type MergedItemFields,
} from "@/lib/actions/mergeInventoryItems";
import { mergeProducts } from "@/lib/actions/mergeProducts";
import type { InventoryItem, Product } from "@/types";

type MergeMode = "consolidate" | "keep-both";

// Fields that only make sense per-item (not shared at the product level) -
// only relevant in "consolidate" mode, where the merged item's own values
// need picking. name/category/unit are handled separately, at the product
// level, since they apply in both modes (see PRODUCT_FIELDS below).
const ITEM_FIELDS: { key: keyof MergedItemFields; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "productSize", label: "Product size" },
  { key: "quantityAvailable", label: "Quantity available" },
  { key: "location", label: "Location" },
  { key: "lowThreshold", label: "Low-stock threshold" },
  { key: "decrementStep", label: "Decrement step" },
  { key: "notes", label: "Notes" },
  { key: "imageUrl", label: "Image URL" },
];

const PRODUCT_FIELDS: { key: "name" | "category" | "unit"; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "unit", label: "Unit" },
];

function itemFieldValue(item: InventoryItem, key: keyof MergedItemFields): string {
  const value = item[key as keyof InventoryItem];
  return typeof value === "string" ? value : "";
}

function productFieldValue(
  product: Product,
  key: "name" | "category" | "unit",
): string {
  return product[key] ?? "";
}

// Default to whichever side actually has a value; if both do, default to
// the longer one (usually the more specific/complete entry).
function defaultValue(a: string, b: string): string {
  if (a && b) return a.length >= b.length ? a : b;
  return a || b;
}

const chipClass = (selected: boolean) =>
  `rounded-md border px-2.5 py-1 text-left text-xs ${
    selected
      ? "border-primary bg-primary/10 font-medium text-primary"
      : "hover:bg-muted"
  }`;

export default function MergeReviewModal({
  productA,
  productB,
  itemA,
  itemB,
  defaultMode,
  onClose,
  onMerged,
}: {
  productA: Product;
  productB: Product;
  itemA: InventoryItem;
  itemB: InventoryItem;
  defaultMode: MergeMode;
  onClose: () => void;
  onMerged: () => void;
}) {
  const [mode, setMode] = useState<MergeMode>(defaultMode);
  const [productValues, setProductValues] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const field of PRODUCT_FIELDS) {
        initial[field.key] = defaultValue(
          productFieldValue(productA, field.key),
          productFieldValue(productB, field.key),
        );
      }
      return initial;
    },
  );
  const [itemValues, setItemValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of ITEM_FIELDS) {
      initial[field.key] = defaultValue(
        itemFieldValue(itemA, field.key),
        itemFieldValue(itemB, field.key),
      );
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setProductField = (key: string, value: string) => {
    setProductValues((previous) => ({ ...previous, [key]: value }));
  };

  const setItemField = (key: string, value: string) => {
    setItemValues((previous) => ({ ...previous, [key]: value }));
  };

  const quantityA = itemFieldValue(itemA, "quantityAvailable");
  const quantityB = itemFieldValue(itemB, "quantityAvailable");
  const quantitySum =
    Number.parseFloat(quantityA || "0") + Number.parseFloat(quantityB || "0");
  const canSumQuantity =
    Number.isFinite(quantitySum) && Boolean(quantityA || quantityB);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      if (mode === "consolidate") {
        const fields: MergedItemFields = {
          name: productValues.name.trim() || itemA.name,
          category: productValues.category.trim() || null,
          unit: productValues.unit.trim() || null,
          brand: itemValues.brand.trim() || null,
          productSize: itemValues.productSize.trim() || null,
          quantityAvailable: itemValues.quantityAvailable.trim() || null,
          location: itemValues.location.trim() || null,
          lowThreshold: itemValues.lowThreshold.trim() || null,
          decrementStep: itemValues.decrementStep.trim() || null,
          notes: itemValues.notes.trim() || null,
          imageUrl: itemValues.imageUrl.trim() || null,
        };

        const result = await mergeInventoryItems(itemA.id, itemB.id, fields);

        if (!result.success) {
          throw new Error(result.message);
        }
      } else {
        const result = await mergeProducts(productA.id, productB.id, {
          name: productValues.name.trim() || productA.name,
          category: productValues.category.trim() || null,
          unit: productValues.unit.trim() || null,
        });

        if (!result.success) {
          throw new Error(result.message);
        }
      }

      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge.");
    } finally {
      setSaving(false);
    }
  };

  const renderChips = (
    a: string,
    b: string,
    value: string,
    onPick: (value: string) => void,
    extraChip?: { label: string; value: string },
  ) => (
    <div className="mt-1 flex flex-wrap gap-2">
      {a && (
        <button type="button" onClick={() => onPick(a)} className={chipClass(value === a)}>
          {a}
        </button>
      )}
      {b && b !== a && (
        <button type="button" onClick={() => onPick(b)} className={chipClass(value === b)}>
          {b}
        </button>
      )}
      {extraChip && (
        <button
          type="button"
          onClick={() => onPick(extraChip.value)}
          className={chipClass(value === extraChip.value)}
        >
          {extraChip.label}
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-[hsl(var(--modal)/0.9)] p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Review this match</h3>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Merge mode">
          <button
            type="button"
            onClick={() => setMode("consolidate")}
            className={`rounded-md border px-3 py-2 text-left text-xs ${
              mode === "consolidate"
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "hover:bg-muted"
            }`}
          >
            Same item - merge into one
          </button>
          <button
            type="button"
            onClick={() => setMode("keep-both")}
            className={`rounded-md border px-3 py-2 text-left text-xs ${
              mode === "keep-both"
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "hover:bg-muted"
            }`}
          >
            Different brands - keep both
          </button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "consolidate"
            ? "Pick which value to keep for each field below. Purchase history and any recipe or grocery-list links from both items move over to the merged one automatically."
            : "Both items stay as separate rows with their own stock - just pick the shared name/category/unit shown for the group."}
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Product
            </p>

            {PRODUCT_FIELDS.map((field) => {
              const a = productFieldValue(productA, field.key);
              const b = productFieldValue(productB, field.key);

              if (a === b) return null;

              return (
                <div key={field.key} className="mt-3">
                  <label className="block text-sm font-medium">{field.label}</label>
                  {renderChips(a, b, productValues[field.key], (value) =>
                    setProductField(field.key, value),
                  )}
                  <input
                    value={productValues[field.key]}
                    onChange={(event) =>
                      setProductField(field.key, event.target.value)
                    }
                    className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>

          {mode === "consolidate" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Item
              </p>

              {ITEM_FIELDS.map((field) => {
                const a = itemFieldValue(itemA, field.key);
                const b = itemFieldValue(itemB, field.key);

                if (a === b) return null;

                return (
                  <div key={field.key} className="mt-3">
                    <label className="block text-sm font-medium">
                      {field.label}
                    </label>
                    {renderChips(
                      a,
                      b,
                      itemValues[field.key],
                      (value) => setItemField(field.key, value),
                      field.key === "quantityAvailable" && canSumQuantity
                        ? { label: `Both (${quantitySum})`, value: quantitySum.toString() }
                        : undefined,
                    )}
                    <input
                      value={itemValues[field.key]}
                      onChange={(event) =>
                        setItemField(field.key, event.target.value)
                      }
                      className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Merging..." : "Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
