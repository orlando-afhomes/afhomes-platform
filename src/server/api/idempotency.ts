import "server-only";
import { createHash } from "node:crypto";
import { ApiError } from "@/server/api/errors";
import { dbRead, dbWrite, uniqueViolation } from "@/server/db";

export type StoredResult = { status: number; body: unknown };

type Existing = { requestHash: string; responseStatus: number; response: unknown; createdAt: string };

// A request still marked "running" after this long is treated as abandoned (crashed process) and may be retried.
const ABANDONED_AFTER_MS = 120_000;

/**
 * One effect per Idempotency-Key. The record is claimed (unique per person, operation and key) before the work starts:
 * - same key and same body after success: the first result is returned again, nothing runs;
 * - same key with a different body: 409;
 * - same key while the first request is still running: 409, retry shortly;
 * - the work failed: the claim is released so a corrected retry can run.
 * `operation` names the endpoint and its path parameters, so one key cannot be replayed against another resource.
 */
export async function runIdempotent(
  input: { userId: string; operation: string; key: string; body: string },
  work: () => Promise<StoredResult>,
): Promise<StoredResult & { replayed: boolean }> {
  const requestHash = createHash("sha256").update(input.body).digest("hex");
  const identity = { userId: input.userId, operation: input.operation, requestKey: input.key };

  const claim = async (): Promise<boolean> => {
    try {
      await dbWrite(`mutation($d: IdempotencyRecord_Data!) { idempotencyRecord_insert(data: $d) }`, { d: { ...identity, requestHash, responseStatus: 0 } });
      return true;
    } catch (error) {
      if (uniqueViolation(error)) return false;
      throw error;
    }
  };
  const release = () => dbWrite(`mutation($u: UUID!, $o: String!, $k: String!) { idempotencyRecord_delete(key: { userId: $u, operation: $o, requestKey: $k }) }`, { u: identity.userId, o: identity.operation, k: identity.requestKey });

  if (!(await claim())) {
    const found = await dbRead<{ idempotencyRecord: Existing | null }>(
      `query($u: UUID!, $o: String!, $k: String!) { idempotencyRecord(key: { userId: $u, operation: $o, requestKey: $k }) { requestHash responseStatus response createdAt } }`,
      { u: identity.userId, o: identity.operation, k: identity.requestKey });
    const existing = found.idempotencyRecord;
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ApiError(409, "idempotency_key_reused", "This Idempotency-Key was already used with a different request.");
      if (existing.responseStatus > 0) return { status: existing.responseStatus, body: existing.response, replayed: true };
      if (Date.now() - Date.parse(existing.createdAt) < ABANDONED_AFTER_MS) throw new ApiError(409, "request_in_progress", "The same request is still running. Try again shortly.");
      await release();
    }
    if (!(await claim())) throw new ApiError(409, "request_in_progress", "The same request is still running. Try again shortly.");
  }

  try {
    const result = await work();
    await dbWrite(
      `mutation($u: UUID!, $o: String!, $k: String!, $s: Int!, $r: Any) { idempotencyRecord_update(key: { userId: $u, operation: $o, requestKey: $k }, data: { responseStatus: $s, response: $r }) }`,
      { u: identity.userId, o: identity.operation, k: identity.requestKey, s: result.status, r: result.body });
    return { ...result, replayed: false };
  } catch (error) {
    await release().catch(() => undefined);
    throw error;
  }
}
