import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DeleteInventoryButton from "@/components/DeleteInventoryButton";
import InventoryIntake from "@/components/InventoryIntake";
import InventoryList from "@/components/InventoryList";
import { getInventory } from "@/lib/actions/getInventory";
import { getProducts } from "@/lib/actions/getProducts";

export default async function InventoryPage() {
  const { userId, has } = await auth();

  if (!userId) {
    redirect("/");
  }

  const [items, products] = await Promise.all([getInventory(), getProducts()]);
  const hasHome = has({ feature: "ai_receipt_parsing" });
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-primary">Home inventory</p>
            <span
              className={
                hasHome
                  ? "inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  : "inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
              }
            >
              {hasHome ? "Home plan" : "Free plan"}
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Keep track of what you have
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add groceries, adjust quantities, and spot low-stock items.
          </p>
        </div>

        <div className="rounded-full border bg-card px-4 py-2 text-sm font-medium">
          {items.length} {items.length === 1 ? "item" : "items"} tracked
        </div>
      </header>

      <InventoryIntake initialInventory={items} initialProducts={products} />

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary">Your pantry</p>
          <h2 className="mt-1 text-2xl font-semibold">Current inventory</h2>
        </div>

        <InventoryList initialItems={items} />
      </section>

      <details className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-400">
          Danger zone
        </summary>
        <div className="pt-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete every inventory item in your account.
          </p>
          <DeleteInventoryButton />
        </div>
      </details>
    </main>
  );
}
