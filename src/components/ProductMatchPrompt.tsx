"use client";

import type { Product } from "@/types";

export default function ProductMatchPrompt({
  itemName,
  candidate,
  onConfirm,
  onDismiss,
}: {
  itemName: string;
  candidate: Product;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <p>
        Looks like you may already have <strong>{candidate.name}</strong>
        {candidate.brands.length > 0 && (
          <> ({candidate.brands.join(", ")})</>
        )}
        . Is &ldquo;{itemName}&rdquo; the same product?
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Yes, combine
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          No, keep separate
        </button>
      </div>
    </div>
  );
}
