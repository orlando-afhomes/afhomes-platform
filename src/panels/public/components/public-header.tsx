import { SiteHeader, type SiteHeaderAction, type SiteNavItem } from "@/shared/components/site";
import { EXPERIENCE_LINKS, MAIN_NAV, SITE } from "@/modules/public-site/content/site";

/** AFhomes public header. The shared SiteHeader does the layout; this file only supplies AFhomes content. */
const NAV_ITEMS: SiteNavItem[] = [
  ...MAIN_NAV.slice(0, 2),
  { label: "Experiences", children: EXPERIENCE_LINKS },
  ...MAIN_NAV.slice(2),
];

/** Verify Accreditation is the secondary action; Join VIP is the main call to action. */
const ACTIONS: SiteHeaderAction[] = [
  { href: "/verify", label: "Verify Accreditation", variant: "outline" },
  { href: "/vip-privilege#cards", label: "Join VIP", variant: "primary" },
];

export function PublicHeader() {
  return (
    <SiteHeader
      brand={{ name: SITE.name, href: "/", logoSrc: "/images/logo.png" }}
      items={NAV_ITEMS}
      actions={ACTIONS}
      mobileExtraLinks={[{ href: "/login", label: "Staff Login" }]}
    />
  );
}
