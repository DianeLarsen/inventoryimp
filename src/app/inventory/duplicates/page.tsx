import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { findDuplicateProducts } from "@/lib/actions/findDuplicateProducts";
import DuplicateProductsReview from "@/components/DuplicateProductsReview";

export default async function DuplicateProductsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const candidates = await findDuplicateProducts();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to inventory
        </Link>

        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Check for duplicate products
        </h1>
        <p className="mt-2 text-muted-foreground">
          Two ways an item can end up listed twice: the exact same product
          entered a second time (usually with less info than the first, since
          nothing caught the match), or a different brand of the same kind of
          product that&apos;s worth grouping together. Both are shown below,
          most certain first. Merging keeps every brand&apos;s own stock and
          purchase history; it just groups them under one product.
        </p>
      </div>

      <DuplicateProductsReview initialCandidates={candidates} />
    </main>
  );
}
