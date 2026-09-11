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
          These look like they might be the same product listed separately -
          often the same thing under a different brand. Review each pair and
          merge the ones that match, or dismiss the ones that don&apos;t.
          Merging keeps every brand&apos;s own stock and purchase history;
          it just groups them under one product.
        </p>
      </div>

      <DuplicateProductsReview initialCandidates={candidates} />
    </main>
  );
}
