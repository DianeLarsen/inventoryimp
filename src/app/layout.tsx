import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Playfair_Display } from "next/font/google";
import Providers from "@/components/providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "InventoryImp",
    template: "%s | InventoryImp",
  },
  description:
    "Track household food inventory, plan groceries, and reduce waste.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning><ClerkProvider>
          <Providers>
            <div
              className={`bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] ${cn(
                "flex min-h-screen flex-col font-sans antialiased",
                inter.variable,
                playfair.variable
              )}`}
            >
              <div className="w-full px-4 md:px-4 lg:px-8 xl:px-16 2xl:px-32">
                <Navbar />
              </div>

              <main className="grow ">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ClerkProvider></body>
    </html>
  );
}
