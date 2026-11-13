import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReportExportInput, ReportRepository } from "@/data/contracts/report-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { BusinessRepository } from "./business-base";
import { hasModuleAccess } from "./authorization";
import { isActiveIdentity } from "./scope";

export class MockReportRepository extends BusinessRepository implements ReportRepository {
  async recordExport(input: ReportExportInput, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      // Anyone who can view reports may export the rows they are allowed to see (owner ruling, 2026-11-13).
      if (!isActiveIdentity(identity) || !hasModuleAccess(this.store, identity, "reports")) throw new Error("Report export is not allowed for this identity.");
      const range = input.range ? `${input.range.from}..${input.range.to}` : "none";
      this.audit(identity, { module: "organization", action: BUSINESS_AUDIT_ACTIONS.REPORT_EXPORTED, entityType: "report-export", entityId: input.report, newValue: `format:${input.format};range:${range};rows:${input.rowCount}` });
    });
  }
}
