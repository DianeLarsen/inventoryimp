import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  PackagePlus,
  ReceiptText,
  ScanBarcode,
  Sparkles,
} from "lucide-react";
import { getInventory } from "@/lib/actions/getInventory";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import HomeFeatureBadge from "@/components/HomeFeatureBadge";

export default async function DashboardPage() {
  const { userId, has } = await auth();

  if (!userId) {
    redirect("/");
  }

  const inventory = await getInventory();
  const hasHome = has({ feature: "ai_receipt_parsing" });
  const categoryCount = new Set(
    inventory.map((item) => item.category?.trim()).filter(Boolean),
  ).size;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
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

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {hasHome
              ? "Your kitchen has a plan now."
              : "Keep the kitchen from becoming a mystery box."}
          </h1>

          <p className="mt-3 text-muted-foreground">
            {hasHome
              ? "Use AI to parse receipts, plan meals, and turn your inventory into a useful grocery plan."
              : "Search products, import structured lists, and keep an honest view of what you already own."}
          </p>
        </div>

        <Link
          href="/inventory"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <PackagePlus className="size-4" />
          Open inventory
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Inventory items
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {inventory.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Products currently tracked
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Categories
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {categoryCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize now; regret nothing later
          </p>
        </div>

        {hasHome ? (
          <Link
            href="/inventory?add=receipt&receipt=text"
            className="group rounded-xl border border-primary/25 bg-primary/5 p-5 shadow-sm transition hover:border-primary/50 hover:bg-primary/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <Sparkles className="size-5" />
                </span>
                <p className="font-semibold text-foreground">
                  Add groceries with AI
                </p>
              </div>

              <ArrowRight className="mt-1 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Paste receipt text or a grocery list and review the AI-created
              draft.
            </p>
          </Link>
        ) : (
          <Link
            href="/inventory?add=receipt&receipt=import"
            className="group rounded-xl border border-primary/25 bg-primary/5 p-5 shadow-sm transition hover:border-primary/50 hover:bg-primary/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <ReceiptText className="size-5" />
                </span>
                <p className="font-semibold text-foreground">
                  Import a grocery list
                </p>
              </div>

              <ArrowRight className="mt-1 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Paste a structured list to review and add items quickly.
            </p>
          </Link>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Start here
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The three quickest ways to keep InventoryImp useful.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              href="/inventory?add=receipt&receipt=photo"
              className="rounded-lg border border-primary/25 bg-primary/5 p-4 transition hover:border-primary/40 hover:bg-primary/10"
            >
              <ReceiptText className="size-5 text-primary" />
              <h3 className="mt-3 font-medium text-foreground">
                Scan a receipt
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a receipt photo and let AI create the item draft.
              </p>
            </Link>

            <Link
              href="/inventory?add=search"
              className="rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-muted/50"
            >
              <ScanBarcode className="size-5 text-primary" />
              <h3 className="mt-3 font-medium text-foreground">
                Scan or search
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Find a packaged item to add.
              </p>
            </Link>

            <Link
              href="/inventory?add=manual"
              className="rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-muted/50"
            >
              <PackagePlus className="size-5 text-primary" />
              <h3 className="mt-3 font-medium text-foreground">Add manually</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                For produce, bulk items, or oddball pantry things.
              </p>
            </Link>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                InventoryImp Home
              </h2>
            </div>

            <HomeFeatureBadge />
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Plan meals and groceries from the items you already have.
          </p>

          <div className="mt-5 space-y-4">
            <div className="border-l-2 border-primary pl-4">
              <p className="font-medium text-foreground">Recipe suggestions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn your tracked ingredients into meals worth making.
              </p>
            </div>

            <div className="border-l-2 border-border pl-4">
              <p className="font-medium text-foreground">Grocery planning</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Build a shopping list from low-stock items and planned meals.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
