import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

/** A failure the API may show the caller: a machine code plus a safe message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/**
 * Safe error body: `{ error: { code, message, fields?, correlationId } }`.
 * Unknown errors become a plain 500; their details go to the server log only,
 * never to the caller (no stack traces, no SQL Connect or provider internals).
 */
export function errorResponse(error: unknown): NextResponse {
  // Next.js signals such as "this route is dynamic" travel as errors and must reach Next, not become a 500.
  unstable_rethrow(error);
  const correlationId = crypto.randomUUID();
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields, correlationId } }, { status: error.status });
  }
  console.error(`[api ${correlationId}]`, error instanceof Error ? error.name : "unknown error");
  return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong. Try again.", correlationId } }, { status: 500 });
}
