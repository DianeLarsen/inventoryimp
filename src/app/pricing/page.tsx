import { PricingTable } from "@clerk/nextjs";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-medium text-primary">InventoryImp Home</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Keep your pantry organized with less typing.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Start a seven-day free trial to use AI receipt parsing. Cancel before
          the trial ends and you will not be charged.
        </p>
      </div>

      <PricingTable />
    </main>
  );
}
