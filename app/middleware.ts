import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Stripe webhook without auth
  if (pathname.startsWith("/api/stripe-webhook")) {
    return NextResponse.next();
  }

  // Other routes can be protected (if needed)
  return NextResponse.next();
}

// Only run this middleware for these paths
export const config = {
  matcher: ["/api/stripe-webhook"],
};
