"use client";

import { useCallback, useId, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, type BadgeTone } from "@/shared/components/modern/status-badge";
import { TextAreaField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { formatPeso } from "@/shared/lib/money";

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn("tw:whitespace-nowrap tw:tabular-nums", className)}>{formatPeso(value)}</span>;
}

const BUSINESS_TONES: Record<string, BadgeTone> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  returned: "warning",
  finalized: "success",
  cancelled: "danger",
  rejected: "danger",
  verified: "success",
  pending: "warning",
  confirmed: "success",
  active: "success",
  expired: "danger",
  suspended: "warning",
  approved: "info",
  on_hold: "warning",
  paid: "success",
  overdue: "danger",
  due: "warning",
  partial: "warning",
  upcoming: "neutral",
  spendable: "success",
  held: "warning",
  voided: "danger",
  blocked_rounding: "warning",
  outside_cycles: "neutral",
  conflict: "danger",
  contract_stated: "neutral",
  configured: "success",
  pending_owner_decision: "warning",
  available: "success",
  unavailable: "neutral",
  retired: "neutral",
  active_member: "success",
  inactive: "neutral",
};

/** Business status badge: readable text first, tone only reinforces it. */
export function BizBadge({ status, label }: { status: string; label?: string }) {
  return <StatusBadge status={label ?? status.replace(/_/g, " ")} tone={BUSINESS_TONES[status] ?? "neutral"} />;
}

/** Runs an async action and reports through toasts; returns whether it succeeded. */
export function useActionRunner() {
  return useCallback(async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
      return false;
    }
  }, []);
}

/** Dialog that collects a required reason before running an action. */
export function ReasonDialog({
  open,
  title,
  description,
  label = "Reason",
  confirmText = "Confirm",
  successText,
  danger,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  label?: string;
  confirmText?: string;
  successText: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const submit = async () => {
    if (!reason.trim()) {
      setError(`${label} is required.`);
      return;
    }
    setPending(true);
    try {
      await onSubmit(reason.trim());
      toast.success(successText);
      setReason("");
      setError(undefined);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !pending ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <TextAreaField label={label} required value={reason} onChange={setReason} error={error} />
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose} className="tw:min-h-11 tw:sm:min-h-8">
            Cancel
          </Button>
          <Button variant={danger ? "destructive" : "default"} disabled={pending} onClick={() => void submit()} className="tw:min-h-11 tw:sm:min-h-8">
            {pending ? "Working…" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shared dialog frame for forms: title, body, and a submit button with progress and an inline error. */
export function FormDialog({
  open,
  title,
  description,
  submitText,
  pending,
  error,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitText: string;
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !pending ? onClose() : undefined)}>
      <DialogContent className="tw:max-h-[90vh] tw:overflow-y-auto tw:sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className="tw:flex tw:flex-col tw:gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          {error ? (
            <p role="alert" className="tw:text-sm tw:text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={onClose} className="tw:min-h-11 tw:sm:min-h-8">
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="tw:min-h-11 tw:sm:min-h-8">
              {pending ? "Working…" : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Search box plus any number of select filters. */
export function FilterBar({
  search,
  onSearch,
  searchLabel,
  filters = [],
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchLabel?: string;
  filters?: Array<{ label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }>;
  children?: ReactNode;
}) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-4 tw:sm:flex-row tw:sm:flex-wrap tw:sm:items-center">
      {onSearch ? (
        <div className="tw:relative tw:w-full tw:sm:max-w-xs">
          <Search aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
          <Input type="search" aria-label={searchLabel} placeholder={searchLabel} value={search ?? ""} onChange={(event) => onSearch(event.target.value)} className="tw:h-11 tw:pl-8 tw:sm:h-8" />
        </div>
      ) : null}
      {filters.map((filter) => (
        <Select key={filter.label} items={filter.options} value={filter.value} onValueChange={(next) => filter.onChange(next ?? filter.options[0].value)}>
          <SelectTrigger aria-label={filter.label} className="tw:h-11 tw:min-w-40 tw:sm:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="tw:min-h-11 tw:sm:min-h-8">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {children}
    </div>
  );
}

/** Titled card section. */
export function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="tw:flex tw:flex-col tw:gap-3">
      <div className="tw:flex tw:flex-col tw:gap-2 tw:sm:flex-row tw:sm:items-end tw:sm:justify-between">
        <div>
          <h2 id={id} className="tw:text-lg tw:font-semibold">
            {title}
          </h2>
          {description ? <p className="tw:text-sm tw:text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Simple tab bar (WAI-ARIA tabs, buttons only; panels are rendered by the caller). */
export function TabBar({ tabs, value, onChange, label }: { tabs: Array<{ value: string; label: string; count?: number }>; value: string; onChange: (value: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="tw:flex tw:flex-wrap tw:gap-1 tw:border-b tw:border-border">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "tw:min-h-11 tw:rounded-t-md tw:border-b-2 tw:px-3 tw:text-sm tw:font-medium tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-9",
              selected ? "tw:border-primary tw:text-foreground" : "tw:border-transparent tw:text-muted-foreground tw:hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="tw:ml-1.5 tw:rounded-full tw:bg-muted tw:px-1.5 tw:text-xs">{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Summary figures row. */
export function StatTiles({ items }: { items: Array<{ label: string; value: ReactNode; hint?: string }> }) {
  return (
    <dl className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-4">
          <dt className="tw:text-sm tw:text-muted-foreground">{item.label}</dt>
          <dd className="tw:m-0 tw:mt-1 tw:text-2xl tw:font-semibold">{item.value}</dd>
          {item.hint ? <p className="tw:mt-1 tw:text-xs tw:text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

/** Loading / error wrapper for query results. */
export function QueryState({ isLoading, error, children }: { isLoading: boolean; error: unknown; children: ReactNode }) {
  if (isLoading) return <Skeleton className="tw:h-32 tw:w-full" />;
  if (error) {
    return (
      <p role="alert" className="tw:rounded-lg tw:border tw:border-destructive/40 tw:p-4 tw:text-sm tw:text-destructive">
        {error instanceof Error ? error.message : "Could not load this data."}
      </p>
    );
  }
  return <>{children}</>;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
