import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/session-constants";

/**
 * Convenience redirect only: in api mode, an /admin visitor with no session cookie goes
 * to sign-in. The cookie's presence proves nothing. Every API handler still verifies
 * the session and checks permissions on the server.
 */
export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "api") return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*"] };
