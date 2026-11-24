"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button, actionMenuClass, isDestructiveAction } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

export type DetailAction = {
  key: string;
  label: string;
  next?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  /** Required: every action button shows its own icon. */
  icon: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  onClick?: () => void;
};

const buttonClass = "tw:min-h-11 tw:min-w-0 tw:shrink tw:sm:min-h-8";

function ActionButton({ action, measure }: { action: DetailAction; measure?: boolean }) {
  const Icon = action.icon;
  return (
    <Button type="button" className={buttonClass} variant={action.variant} title={action.label}
      render={!measure && action.href ? <Link href={action.href} /> : undefined}
      nativeButton={measure || !action.href} disabled={action.disabled} loading={action.loading}
      onClick={measure ? undefined : action.onClick}>
      <Icon aria-hidden="true" />
      <span className="tw:truncate">{action.label}</span>
    </Button>
  );
}

export function DetailActions({ actions, header = false }: {
  actions: readonly (DetailAction | false | null | undefined)[];
  header?: boolean;
}) {
  const items = actions.filter((item): item is DetailAction => Boolean(item));
  const primary = items.filter(({ next, variant }) => next && !isDestructiveAction(variant)).slice(0, 2);
  const [showSecond, setShowSecond] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const sizing = useRef<HTMLDivElement>(null);
  const reserveMenu = items.length > primary.length;

  useLayoutEffect(() => {
    const root = row.current;
    const sample = sizing.current;
    if (!root || !sample) return;
    const measure = () => setShowSecond(sample.offsetWidth <= root.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(sample);
    return () => observer.disconnect();
  }, [primary.length, reserveMenu]);

  const visible = primary.slice(0, showSecond ? 2 : 1);
  const secondary = items.filter((item) => !visible.includes(item));
  const normal = secondary.filter(({ variant }) => !isDestructiveAction(variant));
  const danger = secondary.filter(({ variant }) => isDestructiveAction(variant));
  if (!items.length) return null;

  return (
    <div ref={row} data-actions-managed className={`tw:relative tw:flex tw:min-w-0 tw:items-center tw:gap-2 ${header ? "" : "tw:w-full tw:justify-end"}`}>
      {primary.length === 2 && (
        <div ref={sizing} aria-hidden="true" inert className="tw:pointer-events-none tw:invisible tw:absolute tw:right-0 tw:flex tw:w-max tw:gap-2">
          {primary.map((action) => <ActionButton key={action.key} action={action} measure />)}
          {reserveMenu && <span className="tw:w-11 tw:sm:w-10" />}
        </div>
      )}
      {visible.map((action) => <ActionButton key={action.key} action={action} />)}
      {secondary.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" size={header ? "icon" : "icon-sm"} aria-label="More actions" title="More actions"
            className={`tw:rounded-lg tw:border-transparent tw:bg-muted tw:text-foreground tw:hover:bg-muted/70 ${header ? "tw:size-11 tw:shrink-0 tw:rounded-full tw:sm:size-10" : "tw:size-11 tw:shrink-0 tw:sm:size-10"}`} />}>
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side={header ? "bottom" : "top"} className="tw:w-max tw:max-w-[calc(100vw-2rem)] tw:min-w-44">
            {[...normal, ...danger].map(({ key, label, icon: Icon, disabled, loading, href, variant, onClick }, index) => (
              <div key={key} role="presentation">
                {index === normal.length && normal.length > 0 && danger.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem variant={isDestructiveAction(variant) ? "destructive" : "default"} disabled={disabled || loading}
                  onClick={onClick} render={href ? <Link href={href} /> : undefined}
                  className={`tw:min-h-11 tw:whitespace-normal tw:sm:min-h-8 ${actionMenuClass(variant ?? "default") ?? ""}`}>
                  <Icon aria-hidden="true" />{label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
