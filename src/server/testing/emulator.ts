// Test helpers for the LOCAL emulators only. Imported by server tests, never by app code.
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";

export const ORIGIN = "http://localhost:3000";
const AUTH = "http://127.0.0.1:9099";
const DB = "http://127.0.0.1:9399/v1/projects/demo-afhomes/locations/asia-southeast1/services/afhomes";

/** Call before any server module is imported: points the Admin SDK at the emulators. */
export function configureEmulatorEnv() {
  process.env.FIREBASE_PROJECT_ID = "demo-afhomes";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.DATA_CONNECT_EMULATOR_HOST = "127.0.0.1:9399";
}

async function reachable(url: string) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}
export async function emulatorsUp() {
  return (await reachable(AUTH)) && (await reachable(DB));
}

type RouteHandler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Calls a Route Handler directly with a realistic request. A write gets a fresh Idempotency-Key unless one is given. */
export async function call(handler: RouteHandler, init: { path: string; method?: string; params?: Record<string, string>; body?: unknown; cookie?: string; key?: string | null; origin?: string | null }) {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.cookie) headers.cookie = `afhomes_session=${init.cookie}`;
  if (method !== "GET" && init.key !== null) headers["idempotency-key"] = init.key ?? randomUUID();
  const request = new NextRequest(`${ORIGIN}${init.path.startsWith("/") ? init.path : `/${init.path}`}`, { method, headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  const response = await handler(request, { params: Promise.resolve(init.params ?? {}) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
}

/** Signs a sample account in through the real session route and returns its session cookie. */
export async function sessionCookieFor(sessionPost: RouteHandler, email: string, password: string): Promise<string> {
  const signIn = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const { idToken } = (await signIn.json()) as { idToken: string };
  const response = await sessionPost(
    new NextRequest(`${ORIGIN}/api/v1/session`, { method: "POST", headers: { "Content-Type": "application/json", origin: ORIGIN }, body: JSON.stringify({ idToken }) }),
    { params: Promise.resolve({}) },
  );
  const cookie = /afhomes_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
  if (!cookie) throw new Error(`Sign-in for ${email} failed with ${response.status}.`);
  return cookie;
}
