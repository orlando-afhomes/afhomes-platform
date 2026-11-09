import { cn } from "@/shared/lib/utils";

/** Centered page column for migrated screens. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("tw:mx-auto tw:w-full tw:max-w-7xl tw:px-4 tw:py-6 tw:md:px-6", className)}>{children}</div>;
}
