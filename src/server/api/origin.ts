import type { NextRequest } from "next/server";
import { ApiError } from "@/server/api/errors";

/**
 * Cross-site request protection for cookie-authenticated writes: the browser always
 * sends Origin on these requests, and it must match this site.
 */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new ApiError(403, "forbidden_origin", "This request did not come from this site.");
  }
}
