import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { cn } from "@/shared/lib/utils";

/** Read-only term/value rows for details dialogs and profile sections. */
export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("tw:m-0 tw:flex tw:flex-col", className)}>{children}</dl>;
}

export function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:py-2 tw:last:border-b-0">
      <dt className="tw:w-32 tw:shrink-0 tw:font-medium tw:text-muted-foreground">{term}</dt>
      <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words">{children}</dd>
    </div>
  );
}

/** Informational policy or restriction message (not an error). */
export function InfoNote({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Alert role="note">
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
