import { CircleCheck } from "lucide-react";
import { COMPLIANCE_MILESTONES, COMPLIANCE_PAGE } from "@/modules/public-site/content/compliance";
import { Section, SectionHeading } from "../site/blocks";

const COLUMNS = ["Phase", "Permit", "Issuing agency", "Permit no.", "Start", "Completion", "Duration", "Status"];

/** Compliance milestones: the five permits in one table card that scrolls sideways on small screens. */
export function ComplianceMilestones() {
  const { eyebrow, title } = COMPLIANCE_PAGE.milestones;
  return (
    <Section className="compliance-milestones">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="compliance-milestones__card site-home-reveal">
        <div className="compliance-milestones__scroll" role="region" aria-label="Compliance milestones table" tabIndex={0}>
          <table className="compliance-milestones__table">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column} scope="col">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPLIANCE_MILESTONES.map((row) => (
                <tr key={row.phase}>
                  <th scope="row" className="compliance-milestones__phase">Phase {row.phase}</th>
                  <td>{row.permit}</td>
                  <td>{row.agency}</td>
                  <td>{row.permitNo}</td>
                  <td>{row.start}</td>
                  <td>{row.completion}</td>
                  <td>{row.duration}</td>
                  <td>
                    <span className="compliance-milestones__status">
                      <CircleCheck aria-hidden="true" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
