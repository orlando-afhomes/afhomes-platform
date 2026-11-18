import { ArrowRight } from "lucide-react";
import { COMPLIANCE_PAGE } from "@/modules/public-site/content/compliance";
import { SiteButton } from "../site/blocks";
import { SiteCta } from "../site/site-cta";

/** Closing CTA band; the shared public-site layout. */
export function ComplianceClosing() {
  const { closing } = COMPLIANCE_PAGE;
  return (
    <SiteCta title={closing.title} text={closing.text} image={closing.image}>
      <SiteButton href={closing.href} variant="gold">{closing.cta} <ArrowRight aria-hidden="true" /></SiteButton>
    </SiteCta>
  );
}
