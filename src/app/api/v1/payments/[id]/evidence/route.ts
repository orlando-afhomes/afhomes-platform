import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError, errorResponse } from "@/server/api/errors";
import { runIdempotent } from "@/server/api/idempotency";
import { assertSameOrigin } from "@/server/api/origin";
import { KEY_MESSAGE, KEY_PATTERN } from "@/server/api/route";
import { requireActor } from "@/server/auth/actor";
import { SESSION_COOKIE } from "@/server/auth/session-constants";
import { attachPaymentEvidence } from "@/server/storage";
import { getPaymentView } from "@/server/services/views";

/**
 * Receipt evidence upload (multipart). The shared `route()` wrapper reads a JSON body, so this route
 * repeats its session, origin and Idempotency-Key checks and hashes the file for the replay guard.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    const key = request.headers.get("idempotency-key") ?? "";
    if (!KEY_PATTERN.test(key)) throw new ApiError(400, "idempotency_key_required", KEY_MESSAGE);
    const { id } = await context.params;
    // A file for a receipt this person may not see is reported as 404, never 403.
    await getPaymentView(actor, id);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "file_required", "Attach a receipt file.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");
    const result = await runIdempotent({ userId: actor.userId, operation: `POST /payments/${id}/evidence`, key, body: hash }, async () => ({
      status: 201,
      body: await attachPaymentEvidence(actor, id, bytes, file.name),
    }));
    return NextResponse.json(result.body, { status: result.status, headers: result.replayed ? { "Idempotent-Replay": "true" } : undefined });
  } catch (error) {
    return errorResponse(error);
  }
}
