import { BLOG_POST_PAGE } from "@/modules/public-site/content/blog";
import { SiteButton } from "../site/blocks";
import { SiteCta } from "../site/site-cta";

/** Closing CTA band; the shared public-site layout with a gold link back to the blog. */
export function PostCta() {
  const { cta } = BLOG_POST_PAGE;
  return (
    <SiteCta title={cta.title} text={cta.text} image={cta.image}>
      <SiteButton href={cta.href} action="explore" surface="dark">{cta.label}</SiteButton>
    </SiteCta>
  );
}
