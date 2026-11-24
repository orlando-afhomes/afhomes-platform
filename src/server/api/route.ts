import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError, errorResponse } from "@/server/api/errors";
import { runIdempotent } from "@/server/api/idempotency";
import { assertSameOrigin } from "@/server/api/origin";
import { requireActor, type Actor } from "@/server/auth/actor";
import { SESSION_COOKIE } from "@/server/auth/session-constants";

export type RouteContext = { actor: Actor; params: Record<string, string>; body: unknown; request: NextRequest };
type Handler = (context: RouteContext) => Promise<{ status?: number; body: unknown }>;

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Thin Route Handler wrapper: session and account checks, cross-site protection and the
 * required Idempotency-Key for writes, JSON parsing, and the safe error shape. The handler
 * itself only parses its input, calls a service and returns the result.
 */
export function route(options: { write: boolean; template: string }, handler: Handler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }): Promise<NextResponse> => {
    try {
      const params = await context.params;
      if (options.write) assertSameOrigin(request);
      const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
      const raw = options.write ? await request.text() : "";
      let body: unknown;
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
        }
      }
      const run = async () => {
        const result = await handler({ actor, params, body, request });
        return { status: result.status ?? 200, body: result.body };
      };
      if (!options.write) {
        const result = await run();
        return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
      }
      const key = request.headers.get("idempotency-key") ?? "";
      if (!KEY_PATTERN.test(key)) throw new ApiError(400, "idempotency_key_required", "Send an Idempotency-Key header of 8 to 128 letters, digits or - _ . :");
      const result = await runIdempotent({ userId: actor.userId, operation: `${options.template}:${JSON.stringify(params)}`, key, body: raw }, run);
      return NextResponse.json(result.body, { status: result.status, headers: result.replayed ? { "Idempotent-Replay": "true" } : undefined });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
