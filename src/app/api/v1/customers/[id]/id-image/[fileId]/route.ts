import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/server/api/errors";
import { requireActor } from "@/server/auth/actor";
import { SESSION_COOKIE } from "@/server/auth/session-constants";
import { downloadCustomerIdImage } from "@/server/services/customers";

/** Streams one private government ID image after the same record-scope check as the customer. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    const { id, fileId } = await context.params;
    const { bytes, meta } = await downloadCustomerIdImage(actor, id, fileId);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": meta.contentType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="${meta.fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
