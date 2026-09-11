"use client";

import { useState } from "react";
import { addToInventory } from "@/lib/actions/addToInventory";
import InventoryFormModal from "./InventoryFormModal";
import ProductMatchPrompt from "./ProductMatchPrompt";
import { findSimilarProduct } from "@/lib/utils";
import type { InventoryItem, ManualInventoryInput, Product } from "@/types";

export default function ManualAddForm({
  products = [],
}: {
  products?: Product[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matchPrompt, setMatchPrompt] = useState<{
    item: ManualInventoryInput;
    candidate: Product;
  } | null>(null);

  const submit = async (item: ManualInventoryInput) => {
    setSaving(true);
    try {
      await addToInventory(item);
      setShowModal(false);
      setMatchPrompt(null);
    } catch (err) {
      console.error("❌ Error adding item:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (item: Partial<InventoryItem>) => {
    if (!item.name) {
      console.error("❌ Name is required");
      return;
    }

    const cleanedItem: ManualInventoryInput = {
      name: item.name,
      upc: item.upc ?? undefined,
      category: item.category ?? undefined,
      brand: item.brand ?? undefined,
      quantityAvailable: item.quantityAvailable ?? undefined,
      productSize: item.productSize ?? undefined,
      unit: item.unit ?? undefined,
      location: item.location ?? undefined,
      lowThreshold: item.lowThreshold ?? undefined,
      notes: item.notes ?? undefined,
      imageUrl: undefined, // optional
      decrementStep: item.decrementStep ?? "1",
      expiresAt: item.expiresAt ?? undefined,
    };

    const candidate = findSimilarProduct(
      cleanedItem.name,
      cleanedItem.category,
      products,
    );

    if (candidate) {
      setMatchPrompt({ item: cleanedItem, candidate });
      return;
    }

    await submit(cleanedItem);
  };

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        className="mb-4 bg-primary text-white px-4 py-2 rounded"
      >
        + Add Manually
      </button>

      {showModal && !matchPrompt && (
        <InventoryFormModal
          initialItem={{}}
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
          title="📝 Add New Item"
          isSaving={saving}
        />
      )}

      {matchPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-border bg-[hsl(var(--modal)/0.9)] p-5 shadow-lg">
            <ProductMatchPrompt
              itemName={matchPrompt.item.name}
              candidate={matchPrompt.candidate}
              onConfirm={() =>
                submit({ ...matchPrompt.item, productId: matchPrompt.candidate.id })
              }
              onDismiss={() => submit(matchPrompt.item)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
