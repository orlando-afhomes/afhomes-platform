import { Crown, ShieldCheck } from "lucide-react";
import { SiteHeader, type SiteHeaderAction, type SiteNavItem } from "@/shared/components/site";
import { EXPERIENCE_LINKS, MAIN_NAV } from "@/modules/public-site/content/site";

/** AFhomes public header. The shared SiteHeader does the layout; this file only supplies AFhomes content.
 * Five top-level entries at most (owner, 2026-11-18): Home, VIP Privilege, Experiences, Explore, Contact.
 * Explore holds About, Compliance, FAQ and Blog. */
const NAV_ITEMS: SiteNavItem[] = [
  MAIN_NAV[0], // Home
  MAIN_NAV[2], // VIP Privilege sits outside the dropdown (owner, 2026-11-18)
  { label: "Experiences", triggerClassName: "site-header__dropdown-button--experiences", children: EXPERIENCE_LINKS },
  {
    label: "Explore",
    triggerClassName: "site-header__dropdown-button--explore",
    children: [
      { ...MAIN_NAV[1], description: "Our story, people and values" }, // About
      { ...MAIN_NAV[3], description: "Permits, registrations and disclosures" }, // Compliance
      { ...MAIN_NAV[4], description: "Answers to common questions" }, // FAQ
      { ...MAIN_NAV[5], description: "News and stories from AFhomes" }, // Blog
      { ...MAIN_NAV[7], description: "Promo Points offers and rewards" }, // Offers
    ],
  },
  MAIN_NAV[6], // Contact stays a top-level link (owner, 2026-11-18)
];

/** Verify Accreditation is the secondary action; Join VIP is the main call to action. */
const ACTIONS: SiteHeaderAction[] = [
  { href: "/verify", label: "Verify Accreditation", variant: "outline", icon: <ShieldCheck aria-hidden="true" /> },
  { href: "/vip-privilege#cards", label: "Join VIP", variant: "primary", icon: <Crown aria-hidden="true" /> },
];

export type PublicHeaderProps = {
  /** Solid header for pages on a light background, such as the accreditation verification page. */
  variant?: "transparent" | "solid";
  /** Mark the current page in the menu. Off where the route's params are unknown at build time. */
  trackActive?: boolean;
};

export function PublicHeader({ variant = "transparent", trackActive = true }: PublicHeaderProps) {
  return (
    <SiteHeader
      brand={{ name: "AFHomes", subName: "Group of Companies", href: "/", logoSrc: "/images/logo.png" }}
      items={NAV_ITEMS}
      actions={ACTIONS}
      page={variant === "solid" ? "verify" : undefined}
      trackActive={trackActive}
      mobileExtraLinks={[
        { href: "/login", label: "Staff Login" },
        { href: "/login/sales", label: "Sales Sign-In" },
      ]}
    />
  );
}
