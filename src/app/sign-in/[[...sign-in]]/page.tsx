"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { dark } from "@clerk/ui/themes";

const ClerkSignIn = dynamic(
  () => import("@clerk/nextjs").then(({ SignIn }) => SignIn),
  { ssr: false },
);

export default function SignInPage() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex h-[calc(100vh-96px)] items-center justify-center">
      <ClerkSignIn
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        appearance={{
          theme: resolvedTheme === "dark" ? dark : undefined,
        }}
      />
    </div>
  );
}
