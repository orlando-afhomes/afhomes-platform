import { Badge } from "@/shared/ui/badge";
import { ToneBadge, type BadgeTone } from "@/shared/components/modern/status-badge";
import { cn } from "@/shared/lib/utils";
import { designationLabel } from "@/modules/sales-network/display";

// Presentation of the domain colors (modules/sales-network/display keeps the
// color names; this maps them to the design system).
const DESIGNATION_CLASSES: Record<string, string> = {
  // Solid fills, unlike the tinted status badges, so a position never reads as a status of the same hue.
  SVD: "tw:bg-(--badge-violet) tw:text-white",
  SSM: "tw:bg-(--badge-blue) tw:text-white",
  SM: "tw:bg-(--badge-teal) tw:text-white",
  OST: "tw:bg-(--badge-orange) tw:text-white",
};

/** Designation as a badge; `full` shows the long position title instead of the code. */
export function DesignationBadge({
  designation,
  full = false,
  className,
}: {
  designation: string;
  full?: boolean;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(DESIGNATION_CLASSES[designation] ?? "tw:bg-muted tw:text-muted-foreground", className)}>
      {full ? designationLabel(designation) : designation}
    </Badge>
  );
}

/** Maps the legacy antd color names used by domain display helpers to a badge tone. */
export function toneFromColor(color: string | undefined): BadgeTone {
  switch (color) {
    case "green":
      return "success";
    case "gold":
    case "orange":
      return "warning";
    case "red":
      return "danger";
    default:
      return "neutral";
  }
}

export { ToneBadge };
