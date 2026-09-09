import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChefHat, ListChecks, Sparkles } from "lucide-react";

export default async function RecipesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-12 sm:px-6">
      <section className="surface-card violet-glow w-full rounded-2xl p-8 text-center sm:p-12">
        <span className="mx-auto inline-flex rounded-xl bg-primary/10 p-3 text-primary">
          <ChefHat className="size-7" />
        </span>

        <p className="mt-5 text-sm font-semibold text-primary">Coming soon</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Recipes that start with what you already have
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          InventoryImp is working toward recipe suggestions and grocery planning
          based on your actual inventory. Less duplicate pasta; fewer sad,
          abandoned vegetables.
        </p>

        <div className="mx-auto mt-8 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <Sparkles className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold">Recipe suggestions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Find meal ideas from ingredients you have on hand.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <ListChecks className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold">Smarter grocery lists</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn meal plans and low-stock items into a practical shopping list.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
