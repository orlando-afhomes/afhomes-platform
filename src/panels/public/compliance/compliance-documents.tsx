import { Sprout } from "lucide-react";
import { COMPLIANCE_DOCUMENT_IMAGES, COMPLIANCE_DOCUMENTS_NOTE, COMPLIANCE_PAGE, COMPLIANCE_RECOGNITION } from "@/modules/public-site/content/compliance";
import { Photo, Section, SectionHeading } from "@/panels/public/site/blocks";

/** Supporting permit documents shown in full, then the LGU recognition banner. */
export function ComplianceDocuments() {
  const { eyebrow, title } = COMPLIANCE_PAGE.documents;
  return (
    <Section className="compliance-documents">
      <SectionHeading eyebrow={eyebrow} title={title} text={COMPLIANCE_DOCUMENTS_NOTE} />
      <ul className="compliance-documents__grid site-home-reveal">
        {COMPLIANCE_DOCUMENT_IMAGES.map((document) => (
          <li key={document.src} className="compliance-documents__card">
            <div className="compliance-documents__frame">
              {/* Both scans (about 1.75:1 and 1.96:1) fit whole inside one 16:9 box on white. */}
              <Photo image={{ src: document.src, alt: document.alt }} ratio="16 / 9" fit="contain" className="compliance-documents__photo" sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw" />
            </div>
            <h3 className="compliance-documents__caption">{document.caption}</h3>
          </li>
        ))}
      </ul>
      <div className="compliance-recognition site-home-reveal">
        <span className="compliance-recognition__badge" aria-hidden="true">
          <Sprout className="compliance-recognition__icon" />
        </span>
        <span className="compliance-recognition__divider" aria-hidden="true" />
        <p className="compliance-recognition__text">{COMPLIANCE_RECOGNITION}</p>
      </div>
    </Section>
  );
}
