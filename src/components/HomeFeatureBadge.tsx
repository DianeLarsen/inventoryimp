"use client";

import { Lock, LockOpen } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

export default function HomeFeatureBadge() {
  const { has, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  const isAvailable = has({ feature: "ai_receipt_parsing" });

  return isAvailable ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <LockOpen className="size-3.5" />
      Home active
    </span>
  ) : (
    <Link
      href="/pricing"
      className="button-secondary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
    >
      <Lock className="size-3.5" />
      Explore Home
    </Link>
  );
}
