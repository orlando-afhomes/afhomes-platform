import {
  BadgeCheck, BedDouble, Building2, CalendarDays, CircleX, ClipboardCheck, Coins, CreditCard, Download, FileText, Gift, Globe, GitBranch,
  HandCoins, History, Home, Layers, LayoutDashboard, ListChecks, Map, MapPin, Network, PartyPopper, Percent, ReceiptText, RotateCcw, ScanSearch,
  Scale, ShieldCheck, ShoppingCart, Sparkles, Table, Tag, Ticket, Upload, UserCog, UserRound, UserPlus, Users, Wallet, type LucideIcon,
} from "lucide-react";

/**
 * Default icon for each tab, looked up by tab value so every tab bar shows one.
 * A tab that passes its own `Icon` keeps it.
 */
export const TAB_ICONS: Record<string, LucideIcon> = {
  // Customers and sales
  customers: Users, import: Upload, export: Download, sales: ShoppingCart, contracts: FileText, schemes: Layers, "scheme-guide": ListChecks,
  registrations: UserPlus,
  // Finance
  verification: ReceiptText, collections: Wallet, cancellations: CircleX, "month-end-close": CalendarDays, reconciliation: Scale,
  // Commissions
  commissions: HandCoins, rates: Percent, allowances: Coins, recovery: RotateCcw, summary: LayoutDashboard,
  // Membership, points and redemption
  membership: BadgeCheck, memberships: BadgeCheck, activation: ClipboardCheck, "stay-points": Gift, "welcome-gift": Gift, "resort-bills": ReceiptText,
  waivers: ShieldCheck, promos: Ticket, "promo-points": Sparkles, bookings: BedDouble, "cardholder-points": CreditCard,
  // Settings
  products: Tag, "tier-codes": Layers, "points-table": Table, holidays: PartyPopper, venues: MapPin, lists: ListChecks, "historical-import": History,
  igp: Home, "igp-projects": Map, experiences: Globe,
  // Organization and sales network
  departments: Building2, roles: UserCog, staff: UserRound, members: Users, genealogy: GitBranch, "sales-network": Network,
  // Member detail
  overview: ScanSearch, profile: UserRound, downline: Users, history: History,
};
