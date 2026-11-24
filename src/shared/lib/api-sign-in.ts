import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getClientAuth } from "@/shared/lib/firebase-client";

export type ApiSignInResult = { ok: true } | { ok: false; error: string };

const BAD_CREDENTIALS = new Set(["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password", "auth/invalid-email"]);

/**
 * Checks the password with Firebase Auth, then asks the server for a session cookie.
 * The browser keeps no Firebase session afterwards: the httpOnly cookie is the session.
 */
export async function signInThroughApi(email: string, password: string, portal: string): Promise<ApiSignInResult> {
  const auth = getClientAuth();
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    const response = await fetch("/api/v1/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, portal }),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { ok: false, error: body?.error?.message ?? "Sign-in failed. Try again." };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (BAD_CREDENTIALS.has(code)) return { ok: false, error: "Invalid email or password." };
    if (code === "auth/too-many-requests") return { ok: false, error: "Too many attempts. Try again later." };
    return { ok: false, error: "Sign-in failed. Try again." };
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}
