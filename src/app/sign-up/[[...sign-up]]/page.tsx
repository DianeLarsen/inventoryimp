"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { dark } from "@clerk/ui/themes";

const ClerkSignUp = dynamic(
  () => import("@clerk/nextjs").then(({ SignUp }) => SignUp),
  { ssr: false },
);

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex h-[calc(100vh-96px)] items-center justify-center">
      <ClerkSignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
        appearance={{
          theme: resolvedTheme === "dark" ? dark : undefined,
        }}
      />
    </div>
  );
}
