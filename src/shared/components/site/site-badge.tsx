import { cn } from "@/shared/lib/utils";

/** live = open now (green, pulsing dot), upcoming = opening soon (gold), progress = being built (teal), neutral = anything else. */
export type SiteBadgeTone = "live" | "upcoming" | "progress" | "neutral";

/** Small status pill with a colored dot. Readable on photos and on plain backgrounds. */
export function SiteBadge({ tone = "neutral", children, className }: { tone?: SiteBadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("site-badge", `site-badge--${tone}`, className)}>
      <span className="site-badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
