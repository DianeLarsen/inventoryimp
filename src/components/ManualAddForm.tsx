"use client";

import { useState } from "react";
import { addToInventory } from "@/lib/actions/addToInventory";
import InventoryFormModal from "./InventoryFormModal";
import type { InventoryItem } from "@/types";

export default function ManualAddForm() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAdd = async (item: Partial<InventoryItem>) => {
    if (!item.name) {
      console.error("❌ Name is required");
      return;
    }
  
    setSaving(true);
    try {
      const cleanedItem = {
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
  
      await addToInventory(cleanedItem);
      setShowModal(false);
    } catch (err) {
      console.error("❌ Error adding item:", err);
    } finally {
      setSaving(false);
    }
  };
  
  

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        className="mb-4 bg-primary text-white px-4 py-2 rounded"
      >
        + Add Manually
      </button>

      {showModal && (
        <InventoryFormModal
          initialItem={{}}
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
          title="📝 Add New Item"
          isSaving={saving}
        />
      )}
    </div>
  );
}
