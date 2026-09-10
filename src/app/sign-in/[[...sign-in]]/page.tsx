"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import { useTheme } from "next-themes";
import { Suspense, useEffect, useState } from "react";

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-[calc(100vh-96px)] flex items-center justify-center">
      {mounted && (
        <Suspense>
          <SignIn
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            appearance={{
              theme: resolvedTheme === "dark" ? dark : undefined,
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
