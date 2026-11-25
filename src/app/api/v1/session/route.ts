import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { z } from "zod";
import { errorResponse, ApiError } from "@/server/api/errors";
import { assertSameOrigin } from "@/server/api/origin";
import { loadActorByUid, requireActor, resolveActorFromSessionCookie, type Actor } from "@/server/auth/actor";
import { getGrantedModuleIds, getGrantedOperations } from "@/modules/identity/permissions";
import { RECENT_SIGN_IN_SECONDS, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/server/auth/session-constants";
import { recordAudit } from "@/server/audit";
import { getAdminApp } from "@/server/firebase-admin";

const SignInBody = z.object({
  idToken: z.string().min(20).max(8000),
  portal: z.enum(["admin", "staff", "sales"]).optional(),
});

const STATUS_MESSAGE: Record<string, string> = {
  pending: "This account is not active yet. Contact your administrator.",
  suspended: "This account is suspended. Contact your administrator.",
  deactivated: "This account has been deactivated. Contact your administrator.",
};
const PORTAL_MESSAGE: Record<string, string> = {
  admin: "This account signs in through Admin.",
  staff: "This account signs in through Staff.",
  sales: "Use the sales login at /login/sales.",
};

const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };

/**
 * What the screens may show: the identity plus the modules and operations the same
 * grant tables give the server, so the sidebar and page gates match its decisions.
 */
function sessionBody(actor: Actor) {
  return {
    identity: actor.identity,
    modules: [...getGrantedModuleIds(actor.identity)],
    operations: [...getGrantedOperations(actor.identity)],
  };
}

/** Current session: the signed-in person's identity and access, or 401. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    return NextResponse.json(sessionBody(actor), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Sign in: trade a freshly issued Firebase ID token for a server session cookie.
 * Signing in with Firebase alone grants nothing; the person needs an Active account
 * linked to their Firebase user, and (when named) the right sign-in page.
 */
export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const parsed = SignInBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "invalid_request", "Sign-in request is not valid.");
    const { idToken, portal } = parsed.data;

    const auth = getAuth(getAdminApp());
    const decoded = await auth.verifyIdToken(idToken, true).catch(() => {
      throw new ApiError(401, "invalid_token", "Sign in again.");
    });
    if (Date.now() / 1000 - decoded.auth_time > RECENT_SIGN_IN_SECONDS) {
      throw new ApiError(401, "recent_sign_in_required", "Sign in again.");
    }

    const actor = await loadActorByUid(decoded.uid);
    const deny = async (message: string, reason: string) => {
      await recordAudit({ actorUserId: actor?.userId ?? null, action: "session.sign_in_denied", entityType: "session", entityId: actor?.userId ?? "unknown", correlationId, details: { reason } });
      throw new ApiError(403, "no_access", message);
    };
    if (!actor) return await deny("This account has no access. Contact your administrator.", "no_linked_account");
    if (actor.accountStatus !== "active") return await deny(STATUS_MESSAGE[actor.accountStatus] ?? "This account is not active. Contact your administrator.", `status_${actor.accountStatus}`);
    if (portal && portal !== actor.portal) return await deny(PORTAL_MESSAGE[actor.portal] ?? "Use the correct login page.", "wrong_portal");

    const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
    await recordAudit({ actorUserId: actor.userId, action: "session.sign_in", entityType: "session", entityId: actor.userId, correlationId, details: { portal: actor.portal } });

    const response = NextResponse.json(sessionBody(actor), { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, cookie, { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

/** Sign out: clear the cookie and revoke the person's Firebase refresh tokens, so this session cannot be reused. */
export async function DELETE(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const actor = await resolveActorFromSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
    if (actor) {
      const decoded = await getAuth(getAdminApp()).verifySessionCookie(request.cookies.get(SESSION_COOKIE)!.value, false);
      await getAuth(getAdminApp()).revokeRefreshTokens(decoded.uid);
      await recordAudit({ actorUserId: actor.userId, action: "session.sign_out", entityType: "session", entityId: actor.userId, correlationId });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
