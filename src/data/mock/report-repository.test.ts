import { describe, expect, it } from "vitest";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

describe("report export audit", () => {
  it("records report, format, range and row count only", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-finance"));
    await repos.reports.recordExport({ report: "Collections Report", format: "csv", range: { from: "2026-11-01", to: "2026-11-13" }, rowCount: 7 });
    const event = store.auditEvents.at(-1);
    expect(event).toMatchObject({ action: "REPORT_EXPORTED", entityType: "report-export", entityId: "Collections Report", newValue: "format:csv;range:2026-11-01..2026-11-13;rows:7" });
  });
});
