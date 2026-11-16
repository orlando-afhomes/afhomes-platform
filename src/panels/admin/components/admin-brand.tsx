import Image from "next/image";
import { cn } from "@/shared/lib/utils";

/**
 * Logo tile plus name for the admin shell. The logo file has a white outline, so it sits
 * on a white rounded tile that looks intended on both the dark sidebar and the light top bar.
 * `tone` picks the text colour; `iconOnly` shows just the tile (collapsed rail).
 */
export function AdminBrand({ tone = "dark", iconOnly = false, className }: { tone?: "dark" | "light"; iconOnly?: boolean; className?: string }) {
  return (
    <span data-slot="admin-brand" className={cn("tw:inline-flex tw:min-w-0 tw:items-center tw:gap-3", className)}>
      <span
        aria-hidden="true"
        className="tw:inline-flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-white tw:p-1 tw:shadow-sm tw:ring-1 tw:ring-black/5"
      >
        <Image src="/images/logo.png" alt="" width={32} height={36} priority className="tw:h-full tw:w-auto tw:object-contain" />
      </span>
      {iconOnly ? null : (
        <span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-px">
          <span className={cn("tw:text-[15px] tw:leading-tight tw:font-bold tw:tracking-tight", tone === "dark" ? "tw:text-white" : "tw:text-foreground")}>AFHomes</span>
          <span className={cn("tw:text-[11px] tw:leading-tight tw:whitespace-nowrap", tone === "dark" ? "tw:text-white/65" : "tw:text-muted-foreground")}>Management Platform</span>
        </span>
      )}
    </span>
  );
}
