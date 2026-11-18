import { ChevronRight } from "lucide-react";
import { VIP_PAGE } from "@/modules/public-site/content/vip";
import { SiteButton } from "../site/blocks";
import { SiteCta } from "../site/site-cta";

/** Closing CTA band; the shared public-site layout with the VIP gold accent. */
export function VipClosing() {
  const { closing } = VIP_PAGE;
  return (
    <SiteCta
      title={<>{closing.titleStart} <em className="vip-closing__accent">{closing.titleAccent}</em></>}
      text={closing.text}
      image={closing.image}
    >
      <SiteButton href="/contact" variant="light">Contact us <ChevronRight aria-hidden="true" /></SiteButton>
    </SiteCta>
  );
}
