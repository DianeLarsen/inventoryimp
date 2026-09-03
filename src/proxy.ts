import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isUnprotectedRoute = createRouteMatcher([
  "/loading",
  "/", // ✅ Add this line
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isUnprotectedRoute(req)) {
    console.log("✅ Allowing access to loading page:", req.url);

    return NextResponse.next();
  }
})

export const config = {
  matcher: ['/((?!_next).*)'], // apply to all routes except _next
}


