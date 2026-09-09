"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/ui/themes"; // ✅ Import themes
import { Suspense } from "react";

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  if (!resolvedTheme) return null; // avoid SSR mismatch
  return (
    <div className="h-[calc(100vh-96px)] flex items-center justify-center">
      <Suspense>
        <SignUp
          appearance={{
            theme: resolvedTheme === "dark" ? dark : undefined,
          }}
        />
      </Suspense>
    </div>
  );
}
