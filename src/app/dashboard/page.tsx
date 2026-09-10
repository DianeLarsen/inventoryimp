import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  PackagePlus,
  Sparkles,
} from "lucide-react";
import { getInventory } from "@/lib/actions/getInventory";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


export default async function DashboardPage() {
  const { userId, has } = await auth();

  if (!userId) {
    redirect("/");
  }

  const inventory = await getInventory();
  const hasHome = has({ feature: "ai_receipt_parsing" });

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

            <span className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              {inventory.length} items tracked
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
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <Link
          href={hasHome ? "/recipes" : "/pricing"}
          className="group relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-6 shadow-sm transition hover:border-primary/50 hover:bg-primary/10 sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <Sparkles className="size-6" />
            </span>

            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {hasHome ? "Home active" : "InventoryImp Home"}
            </span>
          </div>

          <div className="mt-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Tonight
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              What&apos;s for dinner?
            </h2>
            <p className="mt-3 text-muted-foreground">
              {hasHome
                ? "Find meal ideas from ingredients already in your kitchen, then use the gaps to build a smarter grocery list."
                : "Start with what you already have. InventoryImp Home suggests meals from tracked ingredients and helps you use food before it becomes a science experiment."}
            </p>

            <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">
              {hasHome ? "Explore recipe ideas" : "Explore InventoryImp Home"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        <Link
          href="/inventory"
          className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/40 hover:bg-muted/50"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <ClipboardList className="size-6" />
            </span>

            <ArrowRight className="mt-1 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Shopping pulse
            </p>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              Stay ahead of the empty shelf.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Set low-stock thresholds for your staples, then turn the items you
              need into a grocery list.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Review inventory
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <CalendarDays className="size-6" />
            </span>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                This week
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                Plan meals before the week plans you.
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Choose meals, check what you already have, and build a grocery
                list around what is missing.
              </p>
            </div>
          </div>

          <Link
            href={hasHome ? "/recipes" : "/pricing"}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {hasHome ? "Start weekly plan" : "Explore Home"}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-7 gap-2 text-center text-xs sm:gap-3">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="rounded-lg border border-border bg-muted/30 px-2 py-4 text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
