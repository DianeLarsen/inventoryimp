"use client";

import { useState } from "react";
import { mergeProducts } from "@/lib/actions/mergeProducts";
import type { DuplicateCandidate } from "@/types";

const keyOf = (candidate: DuplicateCandidate) =>
  `${candidate.productA.id}:${candidate.productB.id}`;

export default function DuplicateProductsReview({
  initialCandidates,
}: {
  initialCandidates: DuplicateCandidate[];
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dismiss = (candidate: DuplicateCandidate) => {
    setCandidates((previous) =>
      previous.filter((entry) => keyOf(entry) !== keyOf(candidate)),
    );
  };

  const merge = async (candidate: DuplicateCandidate, keep: "A" | "B") => {
    const key = keyOf(candidate);
    const keepProduct = keep === "A" ? candidate.productA : candidate.productB;
    const mergeProduct = keep === "A" ? candidate.productB : candidate.productA;

    setPendingKey(key);
    setError(null);

    try {
      const result = await mergeProducts(keepProduct.id, mergeProduct.id);

      if (!result.success) {
        throw new Error(result.message);
      }

      dismiss(candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge products.");
    } finally {
      setPendingKey(null);
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="font-medium">No possible duplicates found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run this again any time after adding more items.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {candidates.map((candidate) => {
        const key = keyOf(candidate);
        const isPending = pendingKey === key;
        const products = [candidate.productA, candidate.productB] as const;

        return (
          <div key={key} className="rounded-xl border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="rounded-lg border bg-muted/30 p-3"
                >
                  <p className="font-medium">{product.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.brands.length > 0
                      ? product.brands.join(", ")
                      : "No brand"}{" "}
                    · {product.itemCount}{" "}
                    {product.itemCount === 1 ? "item" : "items"}
                  </p>
                  <button
                    type="button"
                    onClick={() => merge(candidate, index === 0 ? "A" : "B")}
                    disabled={isPending}
                    className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending ? "Merging..." : "Keep this one"}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {Math.round(candidate.score * 100)}% name match
              </p>
              <button
                type="button"
                onClick={() => dismiss(candidate)}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Not a duplicate
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
