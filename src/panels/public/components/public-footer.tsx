import { ExternalLink, Mail, Phone } from "lucide-react";
import { SiteFooter } from "@/shared/components/site";
import { DISCLAIMER, FOOTER_COLUMNS, OFFICES, SITE, officeMapAnchor } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";

/** AFhomes public footer. The shared SiteFooter does the layout; this file only supplies AFhomes content. */
export function PublicFooter() {
  const info = PUBLIC_SUPPORT_INFO;
  return (
    <SiteFooter
      brand={{ name: SITE.groupName, tagline: SITE.slogan, logoSrc: "/images/logo.png" }}
      contacts={[
        { icon: <Mail aria-hidden="true" />, label: info.email, href: `mailto:${info.email}` },
        { icon: <Phone aria-hidden="true" />, label: info.phone, href: info.phoneHref },
        { icon: <ExternalLink aria-hidden="true" />, label: "Facebook page", href: SITE.facebookUrl, external: true },
      ]}
      columns={FOOTER_COLUMNS}
      locations={OFFICES.map((office) => ({ label: office.label, lines: office.lines, landmark: office.landmark, map: { href: `/contact#${officeMapAnchor(office)}`, label: "View on map" } }))}
      legal={{ disclaimer: DISCLAIMER, copyright: `© 2026 ${SITE.groupName}. All rights reserved.` }}
    />
  );
}
