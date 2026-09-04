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

type ParsedItemWithAction = {
  item: ManualInventoryInput;
  selected: boolean;
  match?: InventoryItem;
  conflict?: string;
};

export default function ReceiptParser({
  initialInventory,
}: {
  initialInventory: InventoryItem[];
}) {
  const [text, setText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItemWithAction[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [store, setStore] = useState("fredmeyer");
  const [structuredImportText, setStructuredImportText] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const { has, isLoaded } = useAuth();

  const canUseAiReceiptParsing = isLoaded && has({ feature: "ai_receipt_parsing" });

  const buildParsedItems = (drafts: ManualInventoryInput[]) => drafts.map((item) => {
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

  const handleStructuredImport = () => {
    setParseError(null);

    try {
      const drafts = parseStructuredInventoryDraft(structuredImportText);
      setParsedItems(buildParsedItems(drafts));
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : "Could not import those receipt items.",
      );
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <label className="text-sm font-medium">Store:</label>
        <select
          className="border px-3 py-2 rounded-md"
          value={store}
          onChange={(e) => setStore(e.target.value)}
        >
          <option value="fredmeyer">Fred Meyer</option>
          <option value="walmart">Walmart</option>
          <option value="safeway">Safeway</option>
        </select>
      </div>

      <textarea
        className="w-full min-h-[150px] p-3 border rounded-md"
        placeholder="Paste a receipt or type grocery items, such as: 2 cans soup and 1 bag rice"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <details className="rounded-md border bg-muted/30 p-4">
        <summary className="cursor-pointer font-medium">
          Use another AI instead — free
        </summary>

        <p className="mt-2 text-sm text-muted-foreground">
          Copy the prompt, use ChatGPT, Gemini, or another AI, then paste only
          the JSON result here. InventoryImp will validate it and let you review
          every item before saving.
        </p>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="border px-3 py-2 rounded-md hover:bg-muted"
          >
            {promptCopied ? "Prompt copied" : "Copy import prompt"}
          </button>
        </div>

        <textarea
          className="mt-3 w-full min-h-[180px] p-3 border rounded-md font-mono text-xs"
          placeholder='Paste JSON from your AI tool, starting with { "items": [...] }'
          value={structuredImportText}
          onChange={(event) => setStructuredImportText(event.target.value)}
        />

        <button
          type="button"
          onClick={handleStructuredImport}
          disabled={!structuredImportText.trim()}
          className="mt-3 border px-4 py-2 rounded-md hover:bg-muted disabled:opacity-60"
        >
          Import structured receipt
        </button>
      </details>
      {parseError && (
        <p role="alert" className="text-sm text-red-600">
          {parseError}
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        {!isLoaded ? (
          <button
            disabled
            className="bg-blue-600 text-white px-4 py-2 rounded-md opacity-60"
          >
            Checking access...
          </button>
        ) : canUseAiReceiptParsing ? (
          <button
            onClick={handleParse}
            disabled={parsing || !text.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {parsing ? "Parsing with AI..." : "Parse with AI"}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Start 7-day free trial
          </Link>
        )}
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
                <strong>{entry.item.name}</strong> — Qty:{" "}
                {entry.item.quantityAvailable} {entry.item.unit || ""}
                {entry.item.cost && <> — Cost: ${entry.item.cost}</>}
                <br />
                {entry.item.upc && (
                  <span className="text-muted-foreground">
                    UPC: {entry.item.upc}
                  </span>
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
