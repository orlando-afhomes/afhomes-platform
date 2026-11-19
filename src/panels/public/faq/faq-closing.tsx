import { FAQ_PAGE } from "@/modules/public-site/content/faq";
import { SiteButton } from "../site/blocks";
import { SiteCta } from "../site/site-cta";

/** Closing CTA band; the shared public-site layout with the FAQ gold accent. */
export function FaqClosing() {
  const { closing } = FAQ_PAGE;
  return (
    <SiteCta
      title={<>{closing.titleStart} <em className="faq-closing__accent">{closing.titleAccent}</em> {closing.titleEnd}</>}
      text={closing.text}
      image={closing.image}
    >
      <SiteButton href={closing.href} action="vip" surface="dark">{closing.cta}</SiteButton>
    </SiteCta>
  );
}
