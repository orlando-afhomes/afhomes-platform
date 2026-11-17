import { ComplianceHero } from "../compliance/compliance-hero";
import { ComplianceMilestones } from "../compliance/compliance-milestones";
import { ComplianceJourney } from "../compliance/compliance-journey";
import { ComplianceDocuments } from "../compliance/compliance-documents";
import { ComplianceClosing } from "../compliance/compliance-closing";
import "../compliance/compliance-hero-table.css";
import "../compliance/compliance-journey.css";
import "../compliance/compliance-documents.css";
import "../compliance/compliance-closing.css";

/**
 * Compliance page, laid out from the owner's Compliance reference design.
 * The wrapper reuses the Home page styling (`site-home`: floating header, serif headings, eyebrow lines, reveal);
 * `site-compliance` marks this page for its own tweaks and the header's "Compliance" underline.
 */
export function CompliancePage() {
  return (
    <div className="site-home site-compliance">
      <ComplianceHero />
      <ComplianceMilestones />
      <ComplianceJourney />
      <ComplianceDocuments />
      <ComplianceClosing />
    </div>
  );
}
