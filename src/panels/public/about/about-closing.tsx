import { ArrowRight } from "lucide-react";
import { ABOUT } from "@/modules/public-site/content/about";
import { SiteButton } from "../site/blocks";
import { SiteCta } from "../site/site-cta";

/** Closing CTA band; the shared public-site layout. */
export function AboutClosing() {
  const { closing } = ABOUT;
  return (
    <SiteCta title={closing.title} text={closing.text} image={closing.image}>
      <SiteButton href={closing.href} variant="gold">{closing.cta} <ArrowRight aria-hidden="true" /></SiteButton>
    </SiteCta>
  );
}
