import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { AuditLogsPage } from "./pages/audit-logs-page";
import { json, renderWithApi } from "@/test/api-harness";

const event = {
  id: "aud-1", timestamp: "2026-11-26T10:00:00.000+08:00", actorId: "user-1", actorName: "Eduardo Ocampo",
  actorRoles: ["admin"], module: "finance", action: "PAYMENT_VERIFIED", entityType: "payment", entityId: "pay-1",
  entityLabel: "Payment · OR-2026-0001", entityName: "OR-2026-0001", entityDetail: null, outcome: "success",
  displayReference: "OR-2026-0001", previousValue: null, newValue: "verified", reason: null, reasonRecorded: false, relatedRecordIds: [],
};

function auditRoutes() {
  return json({ items: [event], page: 1, pageSize: 25, total: 1 });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("audit logs page", () => {
  it("reads the audit history through the API and opens one event", async () => {
    renderWithApi(<AuditLogsPage />, "dev-admin", async (url) => {
      if (url.pathname === "/api/v1/audit/actors") return json({ items: [{ value: "user-1", label: "Eduardo Ocampo" }] });
      if (url.pathname === "/api/v1/audit") return auditRoutes();
      return undefined;
    });
    expect(await screen.findByText("Payment verified")).toBeInTheDocument();
    expect(screen.getByText("Eduardo Ocampo")).toBeInTheDocument();
    expect(screen.getByText("Matching Events")).toBeInTheDocument();
  }, 30_000);

  it("shows the restricted state for an identity without audit.read", async () => {
    renderWithApi(<AuditLogsPage />, "dev-ost-a1");
    expect(await screen.findByText(/does not have access/i)).toBeInTheDocument();
  }, 30_000);
});
