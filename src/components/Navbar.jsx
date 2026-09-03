import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import MobileMenu from "./MobileMenu";
import Image from "next/image";
import { ClerkLoaded, ClerkLoading, Show, UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    <div className="h-24 flex items-center justify-between">
      <nav className="container flex max-w-full items-center justify-between">
        {/* LEFT */}
        <div className="md:hidden lg:block w-[20%]">
          <Link href="/" className="font-serif font-bold text-xl">
            Grocery Inventory
          </Link>
        </div>
        {/* CENTER */}
        <div className="hidden md:flex w-[50%] text-sm items-center justify-between">
          {/* LINKS */}
          <ClerkLoading>
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2  border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white" />
          </ClerkLoading>
          <ClerkLoaded>
            <Show when="signed-in">
              <div className="flex gap-6 text-gray-600">
                <ul className="flex items-center gap-6 text-sm font-light text-muted-foreground sm:gap-10">
                  <li className="transition-colors hover:text-foreground">
                    <Link href="/" className="flex items-center gap-2">
                      <span>Dashboard</span>
                    </Link>
                  </li>
                  <li className="transition-colors hover:text-foreground">
                    <Link href="/recipes" className="flex items-center gap-2">
                      <span>Recipies</span>
                    </Link>
                  </li>

                  <li className="transition-colors hover:text-foreground">
                    <Link href="/inventory" className="flex items-center gap-2">
                      <span>Inventory</span>
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="hidden xl:flex p-2 bg-slate-100 items-center rounded-xl">
                <input
                  type="text"
                  placeholder="search..."
                  className="bg-transparent outline-none"
                />
                <Image src="/search.png" alt="" width={14} height={14} />
              </div>
            </Show>
            <Show when="signed-out">
              <div>Welcome to Grocery Inventory, sign in to continue</div>
            </Show>
          </ClerkLoaded>

          <ThemeToggle />
        </div>
        {/* RIGHT */}
        <div className="w-[30%] flex items-center gap-4 xl:gap-8 justify-end">
          <ClerkLoading>
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2  border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white" />
          </ClerkLoading>
          <ClerkLoaded>
            <Show when="signed-in">
              <UserButton />
            </Show>
            <Show when="signed-out">
              <div className="flex items-center gap-2 text-sm">
                <Link href="/sign-in">Login/Register</Link>
              </div>
            </Show>
          </ClerkLoaded>
          <MobileMenu />
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
