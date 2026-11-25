// @vitest-environment node
// The report export audit endpoint. Runs against the LOCAL emulators (npm run emulators, then npm run db:seed).
import { beforeAll, describe, expect, it } from "vitest";
import { call, configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

type AuditRow = { id: string; action: string; details: { format?: string; range?: string; rowCount?: number } | null };

describe.skipIf(!up)("report export audit (emulators)", () => {
  let session: typeof import("@/app/api/v1/session/route");
  let reports: typeof import("@/app/api/v1/reports/export/route");
  let db: typeof import("@/server/db");
  const cookies: Record<string, string> = {};

  beforeAll(async () => {
    session = await import("@/app/api/v1/session/route");
    reports = await import("@/app/api/v1/reports/export/route");
    db = await import("@/server/db");
    for (const identity of ["dev-admin", "dev-clerk"]) {
      cookies[identity] = await sessionCookieFor(session.POST, account(identity).email, account(identity).password);
    }
    const seeded = await db.dbRead<{ userAccounts: Array<{ id: string }> }>(`query { userAccounts { id } }`);
    if (!seeded.userAccounts.length) throw new Error("Run npm run db:seed first.");
  }, 60_000);

  const auditRows = async (report: string) =>
    (await db.dbRead<{ auditEvents: AuditRow[] }>(`query($id: String!) { auditEvents(where: { entityId: { eq: $id } }) { id action details } }`, { id: report })).auditEvents;

  const body = (report: string) => ({ report, format: "pdf", range: { from: "2026-11-01", to: "2026-11-25" }, rowCount: 7 });

  it("audits the export without row data and replays the same key once", async () => {
    const report = `Collections Report ${Date.now()}`;
    const key = `report-export-${Date.now()}`;
    const first = await call(reports.POST as never, { method: "POST", path: "/api/v1/reports/export", cookie: cookies["dev-admin"], key, body: body(report) });
    expect(first.status).toBe(201);
    const afterFirst = await auditRows(report);
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0].action).toBe("REPORT_EXPORTED");
    expect(afterFirst[0].details).toEqual({ format: "pdf", range: "2026-11-01..2026-11-25", rowCount: 7 });

    const replay = await call(reports.POST as never, { method: "POST", path: "/api/v1/reports/export", cookie: cookies["dev-admin"], key, body: body(report) });
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(await auditRows(report)).toHaveLength(1);
  }, 30_000);

  it("refuses an account without the reports module and a write without a key", async () => {
    const report = `Denied Report ${Date.now()}`;
    // The Clerk has no reports module; sellers do, so they may export the rows they can see.
    const denied = await call(reports.POST as never, { method: "POST", path: "/api/v1/reports/export", cookie: cookies["dev-clerk"], body: body(report) });
    expect(denied.status).toBe(403);
    expect(await auditRows(report)).toHaveLength(0);

    const noKey = await call(reports.POST as never, { method: "POST", path: "/api/v1/reports/export", cookie: cookies["dev-admin"], key: null, body: body(report) });
    expect(noKey.status).toBe(400);
    expect((noKey.body as { error: { code: string } }).error.code).toBe("idempotency_key_required");
  }, 30_000);
});
