import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError, errorResponse } from "@/server/api/errors";
import { runIdempotent } from "@/server/api/idempotency";
import { assertSameOrigin } from "@/server/api/origin";
import { KEY_MESSAGE, KEY_PATTERN } from "@/server/api/route";
import { requireActor } from "@/server/auth/actor";
import { SESSION_COOKIE } from "@/server/auth/session-constants";
import { uploadStaffAvatar } from "@/server/services/organization";

/** Private staff avatar upload (multipart), scoped like the staff record itself. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    const key = request.headers.get("idempotency-key") ?? "";
    if (!KEY_PATTERN.test(key)) throw new ApiError(400, "idempotency_key_required", KEY_MESSAGE);
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "file_required", "Attach an image file.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");
    const result = await runIdempotent({ userId: actor.userId, operation: `POST /staff/${id}/avatar`, key, body: hash }, async () => ({
      status: 201,
      body: await uploadStaffAvatar(actor, id, bytes, file.name),
    }));
    return NextResponse.json(result.body, { status: result.status, headers: result.replayed ? { "Idempotent-Replay": "true" } : undefined });
  } catch (error) {
    return errorResponse(error);
  }
}
