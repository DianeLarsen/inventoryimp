"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Lock } from "lucide-react";
import type { InventoryItem } from "@/types";
import ManualAddForm from "./ManualAddForm";
import ProductSearch from "./ProductSearch";
import ReceiptParser from "./ReceiptParser";

type IntakeMode = "receipt" | "search" | "manual";
type ReceiptMode = "photo" | "text" | "import";

export default function InventoryIntake({
  initialInventory,
}: {
  initialInventory: InventoryItem[];
}) {
  const intakeRef = useRef<HTMLDetailsElement>(null);
  const searchParams = useSearchParams();

  const [activeMode, setActiveMode] = useState<IntakeMode>("receipt");
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>("import");
  const router = useRouter();
  const { has, isLoaded } = useAuth();

  const canUseAiReceiptParsing =
    isLoaded && has({ feature: "ai_receipt_parsing" });
  useEffect(() => {
    const add = searchParams.get("add");
    const receipt = searchParams.get("receipt");

    if (!add || !intakeRef.current) return;

    intakeRef.current.open = true; // native <details> property

    if (add === "receipt" || add === "search" || add === "manual") {
      setActiveMode(add);
    }

    if (receipt === "photo" || receipt === "text" || receipt === "import") {
      setReceiptMode(receipt);
    }
    if (receipt === "photo" || receipt === "text" || receipt === "import") {
      const requestedAiMode = receipt === "photo" || receipt === "text";

      setReceiptMode(
        requestedAiMode && !canUseAiReceiptParsing ? "import" : receipt,
      );
    }

    requestAnimationFrame(() => {
      intakeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [searchParams, canUseAiReceiptParsing]);
  return (
    <details
      ref={intakeRef}
      // open={isOpen}
      // onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group inventory-intake surface-card violet-glow rounded-2xl"
    >
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
          {[
            {
              id: "photo" as const,
              label: "Scan photo",
              detail: "Use a receipt image",
              requiresAi: true,
            },
            {
              id: "text" as const,
              label: "Paste receipt",
              detail: "Use receipt text",
              requiresAi: true,
            },
            {
              id: "import" as const,
              label: "Import a list",
              detail: "Paste structured JSON",
              requiresAi: false,
            },
          ].map((option) => {
            const isActive = receiptMode === option.id;
            const isLocked = option.requiresAi && !canUseAiReceiptParsing;

            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={isLocked}
                data-active={isActive}
                onClick={() => {
                  if (isLocked) {
                    router.push("/pricing");
                    return;
                  }

                  setReceiptMode(option.id);
                }}
                className="intake-tab border-b px-4 py-3 text-left last:border-b-0 sm:border-b-0 sm:border-r last:sm:border-r-0"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {option.label}
                  {isLocked && (
                    <Lock className="size-3.5 text-muted-foreground" />
                  )}
                </span>

                <span className="intake-tab-description block text-xs">
                  {isLocked ? "InventoryImp Home feature" : option.detail}
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
