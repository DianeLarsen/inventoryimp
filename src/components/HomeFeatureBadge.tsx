import { Lock, LockOpen } from "lucide-react";
import Link from "next/link";

export default function HomeFeatureBadge({
  isLoaded,
  isAvailable,
}: {
  isLoaded: boolean;
  isAvailable: boolean;
}) {
  if (!isLoaded) {
    return null;
  }

return isAvailable ? (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
    <LockOpen className="size-3.5" />
    Home unlocked
  </span>
) : (
  <Link
    href="/pricing"
    className="button-secondary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
  >
    <Lock className="size-3.5" />
    Unlock Home
  </Link>
);
}
