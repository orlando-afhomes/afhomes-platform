import { BedDouble, MapPin, ShoppingBag, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { SearchSelectItem } from "@/shared/components/modern/search-select";
import { OUTLET_TYPES, type OutletType } from "@/modules/settings/lists";

const OUTLET_ICON: Record<OutletType, LucideIcon> = {
  accommodation: BedDouble,
  restaurant: UtensilsCrossed,
  spa: Sparkles,
  shop: ShoppingBag,
  other: MapPin,
};

export function outletIcon(type: OutletType): LucideIcon {
  return OUTLET_ICON[type] ?? MapPin;
}

/** Dropdown rows for outlets: an icon for the kind of place and its kind as the second line. */
export function outletItems(outlets: ReadonlyArray<{ id: string; name: string; type: OutletType }>): SearchSelectItem[] {
  return outlets.map((outlet) => ({
    value: outlet.id,
    label: outlet.name,
    icon: outletIcon(outlet.type),
    description: OUTLET_TYPES.find((item) => item.value === outlet.type)?.label,
  }));
}
