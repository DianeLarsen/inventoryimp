"use client";

import { useState } from "react";
import {
  mergeInventoryItems,
  type MergedItemFields,
} from "@/lib/actions/mergeInventoryItems";
import { mergeProducts, type ItemFieldOverrides } from "@/lib/actions/mergeProducts";
import type { InventoryItem, Product } from "@/types";

type MergeMode = "consolidate" | "keep-both" | "different";

// "Same item - merge into one": the complete set of fields for the single
// surviving item - the full edit-item experience, not just a picker for
// whatever happens to differ between the two source items.
const CONSOLIDATE_FIELDS: {
  key: keyof MergedItemFields;
  label: string;
  type?: "date";
}[] = [
  { key: "name", label: "Name" },
  { key: "brand", label: "Brand" },
  { key: "category", label: "Category" },
  { key: "quantityAvailable", label: "Quantity available" },
  { key: "unit", label: "Unit" },
  { key: "productSize", label: "Product size" },
  { key: "upc", label: "UPC" },
  { key: "location", label: "Location" },
  { key: "lowThreshold", label: "Low-stock threshold" },
  { key: "decrementStep", label: "Decrement step" },
  { key: "expiresAt", label: "Best by / expires", type: "date" },
  { key: "notes", label: "Notes" },
  { key: "imageUrl", label: "Image URL" },
];

// "Different brands - keep both": each item keeps its own row, so these are
// plain direct edits per item instead of a shared pick - there's nothing to
// choose between. name/category/unit are shared either way, at the product
// level (see PRODUCT_FIELDS).
const ITEM_FIELDS: { key: keyof MergedItemFields; label: string }[] = [
  { key: "upc", label: "UPC" },
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

function dateOnly(value: string): string {
  return value ? value.slice(0, 10) : "";
}

function itemFieldValue(item: InventoryItem, key: keyof MergedItemFields): string {
  const value = item[key as keyof InventoryItem];
  const stringValue = typeof value === "string" ? value : "";
  return key === "expiresAt" ? dateOnly(stringValue) : stringValue;
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

function itemInitialValues(item: InventoryItem): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const field of ITEM_FIELDS) {
    initial[field.key] = itemFieldValue(item, field.key);
  }
  return initial;
}

const chipClass = (selected: boolean) =>
  `rounded-md border px-2.5 py-1 text-left text-xs ${
    selected
      ? "border-primary bg-primary/10 font-medium text-primary"
      : "hover:bg-muted"
  }`;

const modeButtonClass = (selected: boolean) =>
  `rounded-md border px-3 py-2 text-left text-xs ${
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
  onDismissed,
}: {
  productA: Product;
  productB: Product;
  itemA: InventoryItem;
  itemB: InventoryItem;
  defaultMode: Exclude<MergeMode, "different">;
  onClose: () => void;
  onMerged: () => void;
  onDismissed: () => void;
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
  // "consolidate" mode: the merged item's own values, defaulted from
  // whichever source has something, but every field is always editable.
  const [consolidateValues, setConsolidateValues] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    for (const field of CONSOLIDATE_FIELDS) {
      initial[field.key] = defaultValue(
        itemFieldValue(itemA, field.key),
        itemFieldValue(itemB, field.key),
      );
    }
    return initial;
  });
  // "keep-both" mode: each item keeps its own values, directly editable.
  const [itemAEdits, setItemAEdits] = useState(() => itemInitialValues(itemA));
  const [itemBEdits, setItemBEdits] = useState(() => itemInitialValues(itemB));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setProductField = (key: string, value: string) => {
    setProductValues((previous) => ({ ...previous, [key]: value }));
  };

  const setConsolidateField = (key: string, value: string) => {
    setConsolidateValues((previous) => ({ ...previous, [key]: value }));
  };

  const quantityA = itemFieldValue(itemA, "quantityAvailable");
  const quantityB = itemFieldValue(itemB, "quantityAvailable");
  const quantitySum =
    Number.parseFloat(quantityA || "0") + Number.parseFloat(quantityB || "0");
  const canSumQuantity =
    Number.isFinite(quantitySum) && Boolean(quantityA || quantityB);

  const itemOverridesFrom = (
    edits: Record<string, string>,
  ): Required<ItemFieldOverrides> => ({
    upc: edits.upc.trim() || null,
    brand: edits.brand.trim() || null,
    productSize: edits.productSize.trim() || null,
    quantityAvailable: edits.quantityAvailable.trim() || null,
    location: edits.location.trim() || null,
    lowThreshold: edits.lowThreshold.trim() || null,
    decrementStep: edits.decrementStep.trim() || null,
    notes: edits.notes.trim() || null,
    imageUrl: edits.imageUrl.trim() || null,
  });

  const handleSubmit = async () => {
    if (mode === "different") {
      onDismissed();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === "consolidate") {
        const fields: MergedItemFields = {
          name: consolidateValues.name.trim() || itemA.name,
          upc: consolidateValues.upc.trim() || null,
          brand: consolidateValues.brand.trim() || null,
          category: consolidateValues.category.trim() || null,
          unit: consolidateValues.unit.trim() || null,
          productSize: consolidateValues.productSize.trim() || null,
          quantityAvailable: consolidateValues.quantityAvailable.trim() || null,
          location: consolidateValues.location.trim() || null,
          lowThreshold: consolidateValues.lowThreshold.trim() || null,
          decrementStep: consolidateValues.decrementStep.trim() || null,
          expiresAt: consolidateValues.expiresAt.trim() || null,
          notes: consolidateValues.notes.trim() || null,
          imageUrl: consolidateValues.imageUrl.trim() || null,
        };

        const result = await mergeInventoryItems(itemA.id, itemB.id, fields);

        if (!result.success) {
          throw new Error(result.message);
        }
      } else {
        const result = await mergeProducts(
          productA.id,
          productB.id,
          {
            name: productValues.name.trim() || productA.name,
            category: productValues.category.trim() || null,
            unit: productValues.unit.trim() || null,
          },
          [
            { itemId: itemA.id, fields: itemOverridesFrom(itemAEdits) },
            { itemId: itemB.id, fields: itemOverridesFrom(itemBEdits) },
          ],
        );

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

  const submitLabel =
    mode === "different"
      ? "Not a duplicate"
      : saving
        ? "Merging..."
        : "Merge";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-[hsl(var(--modal)/0.9)] p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Review this match</h3>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Merge mode">
          <button
            type="button"
            onClick={() => setMode("consolidate")}
            className={modeButtonClass(mode === "consolidate")}
          >
            Same item - merge into one
          </button>
          <button
            type="button"
            onClick={() => setMode("keep-both")}
            className={modeButtonClass(mode === "keep-both")}
          >
            Different brands - keep both
          </button>
          <button
            type="button"
            onClick={() => setMode("different")}
            className={modeButtonClass(mode === "different")}
          >
            Different items - not a duplicate
          </button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "consolidate" &&
            "Edit the merged item below - every field defaults from whichever item has it, but you can pick either source or type your own. Purchase history and any recipe or grocery-list links from both items move over to it automatically."}
          {mode === "keep-both" &&
            "Both items stay as separate rows with their own stock, grouped under one shared name/category/unit. Edit each item's own details below if anything needs fixing while you're here."}
          {mode === "different" &&
            "These aren't the same product after all - this just dismisses the match without changing anything."}
        </p>

        {mode === "consolidate" && (
          <div className="mt-4">
            {CONSOLIDATE_FIELDS.map((field) => {
              const a = itemFieldValue(itemA, field.key);
              const b = itemFieldValue(itemB, field.key);

              return (
                <div key={field.key} className="mt-3">
                  <label className="block text-sm font-medium">
                    {field.label}
                  </label>
                  {renderChips(
                    a,
                    b,
                    consolidateValues[field.key],
                    (value) => setConsolidateField(field.key, value),
                    field.key === "quantityAvailable" && canSumQuantity
                      ? { label: `Both (${quantitySum})`, value: quantitySum.toString() }
                      : undefined,
                  )}
                  <input
                    type={field.type === "date" ? "date" : "text"}
                    value={consolidateValues[field.key]}
                    onChange={(event) =>
                      setConsolidateField(field.key, event.target.value)
                    }
                    className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>
        )}

        {mode === "keep-both" && (
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

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  { label: itemA.brand || itemA.name, edits: itemAEdits, setEdits: setItemAEdits },
                  { label: itemB.brand || itemB.name, edits: itemBEdits, setEdits: setItemBEdits },
                ] as const
              ).map(({ label, edits, setEdits }) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>

                  {ITEM_FIELDS.map((field) => (
                    <div key={field.key} className="mt-3">
                      <label className="block text-sm font-medium">
                        {field.label}
                      </label>
                      <input
                        value={edits[field.key]}
                        onChange={(event) =>
                          setEdits((previous) => ({
                            ...previous,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

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
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
