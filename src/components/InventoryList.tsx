"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { InventoryItem } from "@/types";
import EditInventoryModal from "./EditInventoryModal";
import {
  updateInventoryItem,
  updateItemQuantity,
} from "@/lib/actions/updateItem";

type InventoryView =
  | "all"
  | "attention"
  | "expired"
  | "expiring-soon"
  | "low-stock"
  | "missing-expiration";

type SortOption = "updated" | "added" | "name" | "quantity-low";

type ProductGroup = {
  productId: string;
  productName: string;
  items: InventoryItem[];
};

const viewOptions: { id: InventoryView; label: string }[] = [
  { id: "all", label: "All items" },
  { id: "attention", label: "Needs attention" },
  { id: "expired", label: "Expired" },
  { id: "expiring-soon", label: "Expiring soon" },
  { id: "low-stock", label: "Low stock" },
  { id: "missing-expiration", label: "No date" },
];

function getDateOnly(value?: string | null) {
  if (!value) return null;

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getToday() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntilExpiration(value?: string | null) {
  const expirationDate = getDateOnly(value);

  if (!expirationDate) return null;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round(
    (expirationDate.getTime() - getToday().getTime()) / millisecondsPerDay,
  );
}

function getExpirationLabel(item: InventoryItem) {
  const days = daysUntilExpiration(item.expiresAt);

  if (days === null) return null;
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 7) return `Expires in ${days} days`;

  return `Expires ${getDateOnly(item.expiresAt)?.toLocaleDateString()}`;
}

function isLowStock(item: InventoryItem) {
  const quantity = Number.parseFloat(item.quantityAvailable || "");
  const threshold = Number.parseFloat(item.lowThreshold || "");

  return (
    Number.isFinite(quantity) &&
    Number.isFinite(threshold) &&
    quantity <= threshold
  );
}

function isExpired(item: InventoryItem) {
  const days = daysUntilExpiration(item.expiresAt);
  return days !== null && days < 0;
}

function isExpiringSoon(item: InventoryItem) {
  const days = daysUntilExpiration(item.expiresAt);
  return days !== null && days >= 0 && days <= 7;
}

function needsAttention(item: InventoryItem) {
  return isLowStock(item) || isExpired(item) || isExpiringSoon(item);
}

// Only safe to add quantities together when every brand in the group is
// tracked in the same unit - "2 cans + 1 bottle" isn't a number.
function commonUnit(items: InventoryItem[]): string | null {
  const units = items.map((item) => item.unit?.trim().toLowerCase() || null);

  if (units.some((unit) => !unit)) return null;
  if (new Set(units).size > 1) return null;

  return items[0].unit || null;
}

function sumField(
  items: InventoryItem[],
  field: "quantityAvailable" | "lowThreshold",
) {
  return items.reduce(
    (total, item) => total + (Number.parseFloat(item[field] || "0") || 0),
    0,
  );
}

function earliestExpiration(items: InventoryItem[]) {
  let earliest: number | null = null;

  for (const item of items) {
    const days = daysUntilExpiration(item.expiresAt);
    if (days === null) continue;
    if (earliest === null || days < earliest) earliest = days;
  }

  return earliest;
}

function latestTimestamp(items: InventoryItem[], field: "updatedAt" | "addedAt") {
  return Math.max(...items.map((item) => new Date(item[field] || 0).getTime()));
}

export default function InventoryList({
  initialItems,
}: {
  initialItems: InventoryItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [view, setView] = useState<InventoryView>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [filters, setFilters] = useState({
    query: "",
    category: "",
    location: "",
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [brandPicker, setBrandPicker] = useState<{
    group: ProductGroup;
    direction: -1 | 1;
  } | null>(null);

  const categories = [
    ...new Set(
      items
        .map((item) => item.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ].sort();

  const locations = [
    ...new Set(
      items
        .map((item) => item.location)
        .filter((location): location is string => Boolean(location)),
    ),
  ].sort();

  const visibleItems = items.filter((item) => {
    const searchableText = [
      item.name,
      item.brand,
      item.category,
      item.location,
      item.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesFilters =
      (!filters.query ||
        searchableText.includes(filters.query.trim().toLowerCase())) &&
      (!filters.category || item.category === filters.category) &&
      (!filters.location || item.location === filters.location);

    if (!matchesFilters) return false;

    switch (view) {
      case "attention":
        return needsAttention(item);
      case "expired":
        return isExpired(item);
      case "expiring-soon":
        return isExpiringSoon(item);
      case "low-stock":
        return isLowStock(item);
      case "missing-expiration":
        return !item.expiresAt;
      default:
        return true;
    }
  });

  const groupsById = new Map<string, ProductGroup>();

  for (const item of visibleItems) {
    const key = item.productId || item.id;
    const existing = groupsById.get(key);

    if (existing) {
      existing.items.push(item);
    } else {
      groupsById.set(key, {
        productId: key,
        productName: item.productName || item.name,
        items: [item],
      });
    }
  }

  const visibleGroups = [...groupsById.values()].sort((first, second) => {
    if (view === "expiring-soon") {
      const firstExpiration = earliestExpiration(first.items) ?? Infinity;
      const secondExpiration = earliestExpiration(second.items) ?? Infinity;

      return firstExpiration - secondExpiration;
    }

    if (sortBy === "name") {
      return first.productName.localeCompare(second.productName);
    }

    if (sortBy === "quantity-low") {
      const firstUnit = commonUnit(first.items);
      const secondUnit = commonUnit(second.items);
      const firstQty = firstUnit ? sumField(first.items, "quantityAvailable") : Infinity;
      const secondQty = secondUnit ? sumField(second.items, "quantityAvailable") : Infinity;

      return firstQty - secondQty;
    }

    if (sortBy === "updated") {
      return latestTimestamp(second.items, "updatedAt") - latestTimestamp(first.items, "updatedAt");
    }

    if (sortBy === "added") {
      return latestTimestamp(second.items, "addedAt") - latestTimestamp(first.items, "addedAt");
    }

    return 0;
  });

  const clearFilters = () => {
    setView("all");
    setFilters({
      query: "",
      category: "",
      location: "",
    });
  };

  const toggleExpanded = (productId: string) => {
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleAdjustQuantity = async (
    item: InventoryItem,
    direction: -1 | 1,
  ) => {
    const current = Number.parseFloat(item.quantityAvailable || "0");
    const configuredStep = Number.parseFloat(item.decrementStep || "1");
    const step =
      Number.isFinite(configuredStep) && configuredStep > 0
        ? configuredStep
        : 1;

    const updatedQty = Math.max(current + direction * step, 0).toFixed(2);
    const updatedItem = { ...item, quantityAvailable: updatedQty };

    setItems((previous) =>
      previous.map((existing) =>
        existing.id === item.id ? updatedItem : existing,
      ),
    );

    try {
      const result = await updateItemQuantity(item.id, updatedQty);

      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);

      setItems((previous) =>
        previous.map((existing) => (existing.id === item.id ? item : existing)),
      );
    }
  };

  // A group's +/- is unambiguous when there's only one brand in stock; with
  // more than one, ask which brand before adjusting anything.
  const handleGroupAdjust = (group: ProductGroup, direction: -1 | 1) => {
    if (group.items.length === 1) {
      handleAdjustQuantity(group.items[0], direction);
      return;
    }

    setBrandPicker({ group, direction });
  };

  const handleSave = async (updated: InventoryItem) => {
    const previousItem = items.find((item) => item.id === updated.id);

    setItems((previous) =>
      previous.map((item) => (item.id === updated.id ? updated : item)),
    );

    try {
      const result = await updateInventoryItem(updated);

      if (!result.success) {
        throw new Error(result.message);
      }

      setEditingItem(null);
    } catch (error) {
      console.error("Failed to save inventory item:", error);

      if (previousItem) {
        setItems((previous) =>
          previous.map((item) =>
            item.id === previousItem.id ? previousItem : item,
          ),
        );
      }
    }
  };

  const renderItemRow = (item: InventoryItem, options?: { indent?: boolean }) => {
    const lowStock = isLowStock(item);
    const expired = isExpired(item);
    const expiringSoon = isExpiringSoon(item);
    const expirationLabel = getExpirationLabel(item);

    return (
      <article
        key={item.id}
        className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${
          options?.indent ? "sm:pl-12 bg-muted/10" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={48}
              height={48}
              className="size-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
              📦
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-medium">{item.name}</h3>

              {expired && (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                  Expired
                </span>
              )}

              {!expired && expiringSoon && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {expirationLabel}
                </span>
              )}

              {lowStock && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Low stock
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-sm text-muted-foreground">
              {[item.brand, item.category, item.location]
                .filter(Boolean)
                .join(" · ") || "No extra details"}
            </p>

            {!expired && !expiringSoon && expirationLabel && (
              <p className="mt-1 text-xs text-muted-foreground">
                {expirationLabel}
              </p>
            )}

            {!item.expiresAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                No expiration date
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center rounded-lg border bg-background">
            <button
              type="button"
              onClick={() => handleAdjustQuantity(item, -1)}
              className="px-3 py-2 text-lg hover:bg-muted"
              aria-label={`Decrease ${item.name} quantity`}
            >
              −
            </button>

            <span className="min-w-24 px-2 text-center text-sm font-medium">
              {item.quantityAvailable || "0"} {item.unit || ""}
            </span>

            <button
              type="button"
              onClick={() => handleAdjustQuantity(item, 1)}
              className="px-3 py-2 text-lg hover:bg-muted"
              aria-label={`Increase ${item.name} quantity`}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => setEditingItem(item)}
            className="button-secondary rounded-md px-3 py-2 text-sm font-medium"
          >
            Edit
          </button>
        </div>
      </article>
    );
  };

  const renderGroup = (group: ProductGroup) => {
    if (group.items.length === 1) {
      return renderItemRow(group.items[0]);
    }

    const unit = commonUnit(group.items);
    const totalQuantity = unit ? sumField(group.items, "quantityAvailable") : null;
    const lowStock = group.items.some(isLowStock);
    const expired = group.items.some(isExpired);
    const expiringSoon = group.items.some(isExpiringSoon);
    const isExpanded = expandedGroups.has(group.productId);
    const brands = group.items
      .map((item) => item.brand)
      .filter((brand): brand is string => Boolean(brand));

    return (
      <div key={group.productId}>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => toggleExpanded(group.productId)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-medium">{group.productName}</h3>

                {expired && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                    Expired
                  </span>
                )}

                {!expired && expiringSoon && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Expiring soon
                  </span>
                )}

                {lowStock && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Low stock
                  </span>
                )}
              </div>

              <p className="mt-1 truncate text-sm text-muted-foreground">
                {brands.length > 0
                  ? brands.join(", ")
                  : `${group.items.length} brands`}
              </p>
            </div>
          </button>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {unit ? (
              <div className="flex items-center rounded-lg border bg-background">
                <button
                  type="button"
                  onClick={() => handleGroupAdjust(group, -1)}
                  className="px-3 py-2 text-lg hover:bg-muted"
                  aria-label={`Decrease ${group.productName} quantity`}
                >
                  −
                </button>

                <span className="min-w-24 px-2 text-center text-sm font-medium">
                  {totalQuantity} {unit}
                </span>

                <button
                  type="button"
                  onClick={() => handleGroupAdjust(group, 1)}
                  className="px-3 py-2 text-lg hover:bg-muted"
                  aria-label={`Increase ${group.productName} quantity`}
                >
                  +
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Mixed units — expand to adjust
              </p>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="divide-y border-t">
            {group.items.map((item) => renderItemRow(item, { indent: true }))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <input
            type="search"
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                query: event.target.value,
              }))
            }
            placeholder="Search your inventory"
            className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm md:col-span-3"
          />

          <select
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
            className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={filters.location}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm"
            aria-label="Sort inventory"
          >
            <option value="updated">Recently updated</option>
            <option value="added">Recently added</option>
            <option value="name">Name A–Z</option>
            <option value="quantity-low">Quantity: low to high</option>
          </select>
        </div>

        <div
          className="mt-3 flex flex-wrap gap-2 items-center justify-center"
          role="group"
          aria-label="Inventory status views"
        >
          {viewOptions.map((option) => {
            const isActive = view === option.id;

            return (
              <button
                key={option.id}
                type="button"
                data-active={isActive}
                aria-pressed={isActive}
                onClick={() => setView(option.id)}
                className={`intake-tab rounded-md border-b-2 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-primary font-semibold"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Showing {visibleGroups.length} of {groupsById.size} products (
          {visibleItems.length} items)
        </p>

        {(view !== "all" ||
          filters.query ||
          filters.category ||
          filters.location) && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {visibleGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No inventory items found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different filter or add your first item above.
          </p>
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {visibleGroups.map((group) => renderGroup(group))}
        </div>
      )}

      {editingItem && (
        <EditInventoryModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSave}
        />
      )}

      {brandPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-[hsl(var(--modal)/0.9)] p-5 shadow-lg">
            <h3 className="text-base font-semibold">
              Which {brandPicker.group.productName}?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {brandPicker.direction === -1
                ? "Which brand did you use?"
                : "Which brand are you restocking?"}
            </p>

            <div className="mt-4 space-y-2">
              {brandPicker.group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleAdjustQuantity(item, brandPicker.direction);
                    setBrandPicker(null);
                  }}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>{item.brand || item.name}</span>
                  <span className="text-muted-foreground">
                    {item.quantityAvailable || "0"} {item.unit || ""}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setBrandPicker(null)}
              className="mt-4 w-full rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
