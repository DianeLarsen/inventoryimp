"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClerkLoaded, ClerkLoading, Show, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";
import MobileMenu from "./MobileMenu";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/recipes", label: "Recipes" },
];

const Navbar = () => {
  const pathname = usePathname();

  return (
    <header className="py-3">
      <nav className="surface-card violet-glow mx-auto flex h-16 max-w-7xl items-center gap-4 rounded-2xl px-4 sm:px-6">
        <div className="flex flex-1 items-center">
          <Link
            href="/"
            className="font-serif text-xl font-bold tracking-tight transition-colors hover:text-primary"
          >
            Inventory<span className="text-primary">Imp</span>
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <ClerkLoading>
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          </ClerkLoading>

          <ClerkLoaded>
            <Show when="signed-in">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-active={isActive}
                    aria-current={isActive ? "page" : undefined}
                    className={`intake-tab rounded-md border-b-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "border-primary font-semibold"
                        : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </Show>

            <Show when="signed-out">
              <span className="text-sm text-muted-foreground">
                Keep your pantry organized.
              </span>
            </Show>
          </ClerkLoaded>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <ThemeToggle />

          <ClerkLoading>
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          </ClerkLoading>

          <ClerkLoaded>
            <Show when="signed-in">
              <UserButton />
            </Show>

            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="button-secondary rounded-md px-3 py-2 text-sm font-medium"
              >
                Sign in
              </Link>
            </Show>
          </ClerkLoaded>

          <MobileMenu />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
