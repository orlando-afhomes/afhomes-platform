import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError, errorResponse } from "@/server/api/errors";
import { assertSameOrigin } from "@/server/api/origin";

type PublicContext = { params: Record<string, string>; body: unknown; request: NextRequest };
type Handler = (context: PublicContext) => Promise<{ status?: number; body: unknown }>;

/**
 * Route wrapper for endpoints that need no sign-in (public accreditation verification and OST
 * registration). Writes still require a same-origin request and always answer `no-store`.
 * Rate limiting and CAPTCHA are deferred to staging (owner decision, 2026-11-25).
 */
export function publicRoute(options: { write: boolean; template: string }, handler: Handler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }): Promise<NextResponse> => {
    try {
      const params = await context.params;
      if (options.write) assertSameOrigin(request);
      const raw = options.write ? await request.text() : "";
      let body: unknown;
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
        }
      }
      const result = await handler({ params, body, request });
      return NextResponse.json(result.body, { status: result.status ?? 200, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
