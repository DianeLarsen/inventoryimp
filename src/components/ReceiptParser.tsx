"use client";

import { useState } from "react";
import { addToInventory } from "@/lib/actions/addToInventory";
import type { InventoryItem, ManualInventoryInput } from "@/types";
import {
  findMatchingInventoryItem,
  isProductSizeCompatible,
} from "@/lib/utils";
import { parseInventoryDraftAction } from "@/lib/actions/parseInventoryDraftAction";
import { updateInventoryQuantity } from "@/lib/actions/updateInventoryQuantity";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  BYO_AI_RECEIPT_PROMPT,
  parseStructuredInventoryDraft,
} from "@/lib/inventory-draft";
import { parseReceiptImageAction } from "@/lib/actions/parseReceiptImageAction";
import { enrichReceiptDraftsAction } from "@/lib/actions/enrichReceiptDraftsAction";
import HomeFeatureBadge from "./HomeFeatureBadge";

type ParsedItemWithAction = {
  item: ManualInventoryInput;
  selected: boolean;
  match?: InventoryItem;
  conflict?: string;
};

type ReceiptMode = "photo" | "text" | "import";

export default function ReceiptParser({
  initialInventory,
  mode,
}: {
  initialInventory: InventoryItem[];
  mode: ReceiptMode;
}) {
  const [text, setText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItemWithAction[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [structuredImportText, setStructuredImportText] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateParsedItem = (
    index: number,
    changes: Partial<ManualInventoryInput>,
  ) => {
    setParsedItems((previous) =>
      previous.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, item: { ...entry.item, ...changes } }
          : entry,
      ),
    );
  };

  const { has, isLoaded } = useAuth();

  const canUseAiReceiptParsing =
    isLoaded && has({ feature: "ai_receipt_parsing" });

  const buildParsedItems = (drafts: ManualInventoryInput[]) =>
    drafts.map((item) => {
      const { match } = findMatchingInventoryItem(item, initialInventory);

      const conflict =
        match && !isProductSizeCompatible(item.productSize, match.productSize)
          ? "Product size mismatch"
          : undefined;

      return {
        item,
        selected: !match && !conflict,
        match,
        conflict,
      };
    });

  const handleStructuredImport = async () => {
    setImporting(true);
    setParseError(null);

    try {
      const drafts = parseStructuredInventoryDraft(structuredImportText);
      const enrichedDrafts = await enrichReceiptDraftsAction(drafts);

      setParsedItems(buildParsedItems(enrichedDrafts));
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : "Could not import those receipt items.",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleReceiptImageScan = async () => {
    if (!receiptImage) return;

    setScanning(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.set("receipt", receiptImage);

      const drafts = await parseReceiptImageAction(formData);

      setParsedItems(buildParsedItems(drafts));
      setReceiptImage(null);
    } catch (error) {
      console.error("Failed to scan receipt image:", error);
      setParseError(
        error instanceof Error
          ? error.message
          : "Could not read that receipt image.",
      );
    } finally {
      setScanning(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(BYO_AI_RECEIPT_PROMPT);
      setPromptCopied(true);
    } catch {
      setParseError("Could not copy the prompt. Please try again.");
    }
  };

  const handleParse = async () => {
    setParsing(true);
    setParseError(null);

    try {
      const drafts = await parseInventoryDraftAction(text);

      setParsedItems(buildParsedItems(drafts));
    } catch (error) {
      console.error("Failed to parse inventory draft:", error);
      setParseError(
        error instanceof Error
          ? error.message
          : "Could not parse those grocery items.",
      );
    } finally {
      setParsing(false);
    }
  };

  // const handleRemoveItem = (index: number) => {
  //   setParsedItems((prev) => prev.filter((_, i) => i !== index));
  // };
  const handleAddSelected = async () => {
    const selectedIndexes = parsedItems
      .map((entry, index) => (entry.selected ? index : -1))
      .filter((index) => index !== -1);

    if (selectedIndexes.length === 0) return;

    setSubmitting(true);
    setParseError(null);

    const successfullyAdded = new Set<number>();
    const failedNames: string[] = [];

    for (const index of selectedIndexes) {
      try {
        await addToInventory(parsedItems[index].item);
        successfullyAdded.add(index);
      } catch (error) {
        console.error("Failed to add inventory item:", error);
        failedNames.push(parsedItems[index].item.name);
      }
    }

    setParsedItems((previous) =>
      previous.filter((_, index) => !successfullyAdded.has(index)),
    );

    if (failedNames.length > 0) {
      setParseError(
        `Could not add: ${failedNames.join(", ")}. Those items remain in the list.`,
      );
    }

    setSubmitting(false);
  };
  const selectedCount = parsedItems.filter((entry) => entry.selected).length;

  const toggleAll = () => {
    const shouldSelectAll = parsedItems.some((entry) => !entry.selected);

    setParsedItems((previous) =>
      previous.map((entry) => ({
        ...entry,
        selected: shouldSelectAll,
      })),
    );
  };

  return (
    <div className="space-y-4">
      {mode === "text" && (
        <section className="intake-content-card space-y-3 rounded-xl p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-primary">
                AI receipt parsing
              </p>
              <HomeFeatureBadge />
            </div>

            <h3 className="mt-1 text-lg font-semibold">Paste receipt text</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste grocery-list or receipt text, then review every item before
              saving.
            </p>
          </div>

          <textarea
            className="w-full min-h-[180px] rounded-md border p-3"
            placeholder="Paste a receipt or type grocery items, such as: 2 cans soup and 1 bag rice"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </section>
      )}

      {mode === "photo" && (
        <section className="intake-content-card rounded-xl p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-primary">
                AI receipt scan
              </p>

              <HomeFeatureBadge />
            </div>

            <h3 className="mt-1 text-lg font-semibold">Scan a receipt photo</h3>

            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Upload a clear receipt image. You will review and edit every item
              before anything is added to your inventory.
            </p>
          </div>

          {!isLoaded ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Checking access...
            </p>
          ) : canUseAiReceiptParsing ? (
            <>
              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/5 px-6 py-8 text-center transition hover:border-primary/65 hover:bg-primary/10">
                <span className="text-sm font-medium">
                  {receiptImage ? receiptImage.name : "Choose a receipt photo"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, or WebP · up to 4 MB
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) =>
                    setReceiptImage(event.target.files?.[0] ?? null)
                  }
                />
              </label>

              {receiptImage && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Ready to scan. Your image is used to create review drafts and
                  is not saved by InventoryImp.
                </p>
              )}

              <button
                type="button"
                onClick={handleReceiptImageScan}
                disabled={scanning || !receiptImage}
                className="button-primary mt-5 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scanning ? "Reading receipt..." : "Scan receipt"}
              </button>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                Receipt photo scanning is included with the Home plan and its
                seven-day trial.
              </p>

              <Link
                href="/pricing"
                className="button-primary mt-3 inline-block rounded-md px-4 py-2 text-sm font-medium"
              >
                Start 7-day free trial
              </Link>
            </div>
          )}
        </section>
      )}

      {mode === "import" && (
        <section className="intake-content-card rounded-xl p-4">
          <h3 className="font-medium">Import from another AI — free</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy the prompt, use ChatGPT, Gemini, or another AI, then paste only
            the JSON result here. InventoryImp validates it and lets you review
            every item before saving.
          </p>

          <button
            type="button"
            onClick={handleCopyPrompt}
            className="mt-3 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            {promptCopied ? "Prompt copied" : "Copy import prompt"}
          </button>

          <textarea
            className="mt-3 min-h-[180px] w-full rounded-md border p-3 font-mono text-xs"
            placeholder='Paste JSON from your AI tool, starting with { "items": [...] }'
            value={structuredImportText}
            onChange={(event) => setStructuredImportText(event.target.value)}
          />

          <button
            type="button"
            onClick={handleStructuredImport}
            disabled={importing || !structuredImportText.trim()}
            className="mt-3 rounded-md border px-4 py-2 hover:bg-muted disabled:opacity-60"
          >
            {importing ? "Looking up barcodes..." : "Import structured receipt"}
          </button>
        </section>
      )}
      {parseError && (
        <p role="alert" className="text-sm text-red-600">
          {parseError}
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        {mode === "text" &&
          (!isLoaded ? (
            <button
              disabled
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground opacity-60"
            >
              Checking access...
            </button>
          ) : canUseAiReceiptParsing ? (
            <button
              onClick={handleParse}
              disabled={parsing || !text.trim()}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {parsing ? "Parsing with AI..." : "Parse with AI"}
            </button>
          ) : (
            <Link
              href="/pricing"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
            >
              Start 7-day free trial
            </Link>
          ))}
        {parsedItems.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="border px-4 py-2 rounded-md hover:bg-muted"
          >
            {selectedCount === parsedItems.length
              ? "Deselect all"
              : "Select all"}
          </button>
        )}

        {parsedItems.length > 0 && (
          <button
            onClick={handleAddSelected}
            disabled={submitting || selectedCount === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "Adding..." : `Add ${selectedCount} selected`}
          </button>
        )}
      </div>
      {parsedItems.length > 0 && (
        <div className="mt-4 space-y-2">
          {parsedItems.map((entry, i) => (
            <div
              key={i}
              className="p-3 border rounded bg-muted/50 text-sm flex justify-between items-start gap-4"
            >
              <div className="flex-1">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={entry.selected}
                    onChange={(event) =>
                      setParsedItems((previous) =>
                        previous.map((parsedItem, index) =>
                          index === i
                            ? { ...parsedItem, selected: event.target.checked }
                            : parsedItem,
                        ),
                      )
                    }
                  />
                  Add as a new inventory item
                </label>
                {editingIndex === i ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={entry.item.name}
                      onChange={(event) =>
                        updateParsedItem(i, { name: event.target.value })
                      }
                      className="rounded border bg-background px-2 py-1"
                      placeholder="Item name"
                    />
                    <input
                      value={entry.item.quantityAvailable ?? ""}
                      onChange={(event) =>
                        updateParsedItem(i, {
                          quantityAvailable: event.target.value,
                        })
                      }
                      className="rounded border bg-background px-2 py-1"
                      placeholder="Quantity"
                    />
                    <input
                      value={entry.item.unit ?? ""}
                      onChange={(event) =>
                        updateParsedItem(i, {
                          unit: event.target.value || undefined,
                        })
                      }
                      className="rounded border bg-background px-2 py-1"
                      placeholder="Unit"
                    />
                    <input
                      value={entry.item.productSize ?? ""}
                      onChange={(event) =>
                        updateParsedItem(i, {
                          productSize: event.target.value || undefined,
                        })
                      }
                      className="rounded border bg-background px-2 py-1"
                      placeholder="Package size"
                    />
                    <input
                      value={entry.item.upc ?? ""}
                      onChange={(event) =>
                        updateParsedItem(i, {
                          upc: event.target.value || undefined,
                        })
                      }
                      className="rounded border bg-background px-2 py-1"
                      placeholder="UPC"
                    />
                    <input
                      value={entry.item.cost ?? ""}
                      onChange={(event) =>
                        updateParsedItem(i, {
                          cost: event.target.value || undefined,
                        })
                      }
                      className="rounded border bg-background px-2 py-1"
                      placeholder="Cost"
                    />
                  </div>
                ) : (
                  <>
                    <strong>{entry.item.name}</strong> — Qty:{" "}
                    {entry.item.quantityAvailable} {entry.item.unit || ""}
                    {entry.item.cost && <> — Cost: ${entry.item.cost}</>}
                    <br />
                    {entry.item.upc ? (
                      <span className="text-muted-foreground">
                        UPC: {entry.item.upc}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        No UPC detected
                      </span>
                    )}
                  </>
                )}
                {entry.match && (
                  <div className="text-xs text-amber-700 mt-1">
                    {entry.conflict ? (
                      <>⚠️ Conflict: {entry.conflict}</>
                    ) : (
                      <>
                        Matches <strong>{entry.match.name}</strong>
                        {entry.match.unit && ` (${entry.match.unit})`}
                        {entry.match.location && ` in ${entry.match.location}`}.
                        Use “Add to current” to increase its quantity, or select
                        this item to add it separately.
                      </>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingIndex(editingIndex === i ? null : i)
                    }
                    className="text-xs px-2 py-1 rounded border hover:bg-muted"
                  >
                    {editingIndex === i ? "Done editing" : "Edit"}
                  </button>
                  {entry.match && (
                    <button
                      onClick={async () => {
                        try {
                          const qty = parseFloat(
                            entry.item.quantityAvailable || "0",
                          );
                          const result = await updateInventoryQuantity(
                            entry.item.upc,
                            entry.item.name,
                            qty,
                          );
                          if (result.success) {
                            setParsedItems((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            );
                          } else {
                            alert(
                              result.message || "Failed to update quantity.",
                            );
                          }
                        } catch (err) {
                          console.error("Failed to add to current:", err);
                          alert("Something went wrong.");
                        }
                      }}
                      className="text-xs px-2 py-1 rounded border bg-green-500 text-white hover:bg-green-600"
                    >
                      Add to current
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  setParsedItems((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="text-red-600 hover:underline text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
