import {
  ArrowDown,
  BookOpen,
  ChevronDown,
  Compass,
  Crown,
  Gem,
  Landmark,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** One visual identity per public action: icon plus primary/secondary/gold prominence. */
export type SiteAction =
  | "contact"
  | "payment-steps"
  | "join-vip"
  | "verify"
  | "compare"
  | "floor-plans"
  | "amenities"
  | "learn"
  | "story"
  | "experiences"
  | "vip"
  | "talk"
  | "read"
  | "directions"
  | "open-map"
  | "explore";

export type SiteSurface = "light" | "dark";
/** Home and About keep the white primary on dark photos; every other page uses the green brand primary. */
export type SitePrimaryTone = "brand" | "contrast";

type SiteActionConfig = {
  icon: LucideIcon;
  role: "primary" | "secondary" | "gold";
};

export const SITE_ACTIONS: Record<SiteAction, SiteActionConfig> = {
  contact: { icon: Phone, role: "primary" },
  "payment-steps": { icon: ReceiptText, role: "secondary" },
  "join-vip": { icon: Crown, role: "gold" },
  verify: { icon: ShieldCheck, role: "secondary" },
  compare: { icon: Layers, role: "primary" },
  "floor-plans": { icon: LayoutDashboard, role: "secondary" },
  amenities: { icon: Sparkles, role: "secondary" },
  learn: { icon: ChevronDown, role: "secondary" },
  story: { icon: Landmark, role: "secondary" },
  experiences: { icon: ArrowDown, role: "secondary" },
  vip: { icon: Gem, role: "gold" },
  talk: { icon: MessageCircle, role: "primary" },
  read: { icon: BookOpen, role: "secondary" },
  directions: { icon: MapPin, role: "secondary" },
  "open-map": { icon: MapIcon, role: "secondary" },
  explore: { icon: Compass, role: "primary" },
};

/** Resolve the icon and surface-appropriate button class for an action. */
export function resolveSiteButton(action: SiteAction, surface: SiteSurface = "light", primaryTone: SitePrimaryTone = "brand") {
  const { icon, role } = SITE_ACTIONS[action];
  const variant =
    role === "gold"
      ? "gold"
      : role === "primary"
        ? surface === "dark" && primaryTone === "contrast" ? "light" : "primary"
        : surface === "dark" ? "outline-light" : "outline";

  return { icon, className: `site-button site-button--${variant}` };
}
