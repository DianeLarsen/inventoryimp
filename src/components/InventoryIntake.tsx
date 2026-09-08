"use client";

import { useState } from "react";
import type { InventoryItem } from "@/types";
import ManualAddForm from "./ManualAddForm";
import ProductSearch from "./ProductSearch";
import ReceiptParser from "./ReceiptParser";

type IntakeMode = "receipt" | "search" | "manual";
type ReceiptMode = "photo" | "text" | "import";

const intakeOptions: {
  id: IntakeMode;
  label: string;
  description: string;
}[] = [
  {
    id: "receipt",
    label: "Receipt",
    description:
      "Add groceries from a receipt photo, pasted text, or AI import.",
  },
  {
    id: "search",
    label: "Search product",
    description: "Find an item by name or barcode.",
  },
  {
    id: "manual",
    label: "Add manually",
    description: "Create an item when you already know its details.",
  },
];

export default function InventoryIntake({
  initialInventory,
}: {
  initialInventory: InventoryItem[];
}) {
  const [activeMode, setActiveMode] = useState<IntakeMode>("receipt");
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>("photo");

  return (
    <details className="group inventory-intake surface-card violet-glow rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div>
          <p className="font-medium">Add items</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan a receipt, search a barcode, or add an item manually.
          </p>
        </div>

        <span className="button-secondary rounded-md border px-3 py-2 text-sm font-medium group-open:hidden">
          Open
        </span>
        <span className="button-secondary hidden rounded-md border px-3 py-2 text-sm font-medium group-open:inline">
          Close
        </span>
      </summary>

      <div className="border-t">
        <div
          className="grid border-b sm:grid-cols-3"
          role="tablist"
          aria-label="Ways to add inventory"
        >
          {intakeOptions.map((option) => {
            const isActive = activeMode === option.id;

            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-active={isActive}
                onClick={() => setActiveMode(option.id)}
                className="intake-tab border-b-2 px-5 py-4 text-left transition sm:border-b-0 sm:border-r last:sm:border-r-0"
              >
                <span className="block font-medium">{option.label}</span>
                <span className="intake-tab-description mt-1 block text-xs">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6">
          <div hidden={activeMode !== "receipt"} className="space-y-5">
            <div
              className="grid overflow-hidden rounded-xl border sm:grid-cols-3"
              role="tablist"
              aria-label="Receipt intake method"
            >
              {[
                {
                  id: "photo" as const,
                  label: "Scan photo",
                  detail: "Use a receipt image",
                },
                {
                  id: "text" as const,
                  label: "Paste receipt",
                  detail: "Use receipt text",
                },
                {
                  id: "import" as const,
                  label: "Free AI import",
                  detail: "Paste structured JSON",
                },
              ].map((option) => {
                const isActive = receiptMode === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-active={isActive}
                    onClick={() => setReceiptMode(option.id)}
                    className="intake-tab border-b px-4 py-3 text-left last:border-b-0 sm:border-b-0 sm:border-r last:sm:border-r-0"
                  >
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="intake-tab-description block text-xs">
                      {option.detail}
                    </span>
                  </button>
                );
              })}
            </div>

            <ReceiptParser
              initialInventory={initialInventory}
              mode={receiptMode}
            />
          </div>

          <div hidden={activeMode !== "search"}>
            <ProductSearch />
          </div>

          <div hidden={activeMode !== "manual"}>
            <ManualAddForm />
          </div>
        </div>
      </div>
    </details>
  );
}
