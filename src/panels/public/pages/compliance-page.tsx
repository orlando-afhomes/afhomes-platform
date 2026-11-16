import { Check } from "lucide-react";
import { COMPLIANCE_DOCUMENTS_NOTE, COMPLIANCE_DOCUMENT_IMAGES, COMPLIANCE_INTRO, COMPLIANCE_MILESTONES, COMPLIANCE_PHASES, COMPLIANCE_RECOGNITION } from "@/modules/public-site/content/compliance";
import { CtaBand, PageHero, Photo, Section, SectionHeading } from "../site/blocks";

export function CompliancePage() {
  return (
    <>
      <PageHero eyebrow="AFhomes Hotspring & Ecofarm Resort" title="Compliance" lede={COMPLIANCE_INTRO} />

      <Section>
        <SectionHeading eyebrow="Compliance milestones" title="Five permits, all completed" />
        <div className="site-table-wrap" role="region" aria-label="Compliance milestones table" tabIndex={0}>
          <table className="site-table">
            <thead>
              <tr>
                <th scope="col">Phase</th><th scope="col">Permit</th><th scope="col">Issuing agency</th><th scope="col">Permit no.</th>
                <th scope="col">Start</th><th scope="col">Completion</th><th scope="col">Duration</th><th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {COMPLIANCE_MILESTONES.map((row) => (
                <tr key={row.phase}>
                  <th scope="row">Phase {row.phase}</th>
                  <td>{row.permit}</td><td>{row.agency}</td><td>{row.permitNo}</td>
                  <td>{row.start}</td><td>{row.completion}</td><td>{row.duration}</td>
                  <td><span className="site-done"><Check aria-hidden="true" className="site-done__icon" />{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="soft">
        <SectionHeading eyebrow="Our compliance journey" title="Step-by-step regulatory milestones" text="Ensuring 100% compliance with Philippine environmental, safety, and land-use regulations" />
        <ol className="site-steps">
          {COMPLIANCE_PHASES.map((phase) => (
            <li key={phase.phase} className="site-step">
              <span className="site-step__number">{phase.phase}</span>
              <div>
                <h3 className="site-step__title">Phase {phase.phase}: {phase.title}</h3>
                <p className="site-step__subtitle">{phase.subtitle}</p>
                <p>{phase.paragraphs[0]}</p>
                {phase.bullets ? <ul className="site-step__list">{phase.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
                {phase.paragraphs.slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionHeading eyebrow="Supporting documents" title="Permits for public reference" text={COMPLIANCE_DOCUMENTS_NOTE} />
        <ul className="site-grid site-grid--2">
          {COMPLIANCE_DOCUMENT_IMAGES.map((doc) => (
            <li key={doc.src} className="site-card">
              <Photo image={{ src: doc.src, alt: doc.alt }} ratio="3 / 2" fit="contain" className="site-card__photo" sizes="(min-width: 1024px) 520px, 100vw" />
              <div className="site-card__body"><h3 className="site-card__title">{doc.caption}</h3></div>
            </li>
          ))}
        </ul>
        <p className="site-callout">{COMPLIANCE_RECOGNITION}</p>
      </Section>

      <CtaBand title="Want to verify a document?" text="Supporting documents can be verified through a scheduled meeting with our Compliance Department." />
    </>
  );
}
