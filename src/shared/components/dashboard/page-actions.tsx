"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button, actionMenuClass, isDestructiveAction } from "@/shared/ui/button";
import { labelIcon } from "@/shared/ui/button-icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

type MenuEntry = { key: number; label: string; icon: string; danger: boolean; variant: string | null; disabled: boolean; element: HTMLElement };

const MENU_SLOT = 52; // the round "..." button (44px) plus the gap before it
/** The red button variant (not the aria-invalid state classes every button carries). */
const DANGER = /(^|\s)(tw:)?(bg|text)-destructive|(^|\s)destructive(\s|$)/;
const ACTION_SELECTOR = "a[href], button";

/** Buttons that belong to the header's own controls (menus, pickers, rows that already manage themselves) stay where they are. */
function isAction(element: HTMLElement) {
  if (element.closest("[data-actions-managed], [inert], [aria-hidden='true']")) return false;
  if (element.hasAttribute("aria-haspopup") || element.getAttribute("role") === "combobox") return false;
  return true;
}

function describe(element: HTMLElement, key: number): MenuEntry {
  const label = element.getAttribute("aria-label") || element.textContent?.trim() || element.title || "Action";
  const disabled = (element as HTMLButtonElement).disabled === true || element.getAttribute("aria-disabled") === "true";
  const variant = element.getAttribute("data-action-variant");
  return { key, label, variant, icon: element.querySelector("svg")?.outerHTML ?? "", danger: isDestructiveAction(variant) || DANGER.test(element.className), disabled, element };
}

/**
 * Wrapper for the buttons in a page or card header. At most two buttons show, with icon and label,
 * always on one row: the first two are the next steps, so callers list them first. The rest move
 * into a round "..." menu (red actions last). If even two do not fit the width, one shows.
 * Hidden buttons stay mounted, so a dialog they own keeps working; their menu entry clicks them.
 */
export function PageActions({ children, className }: { children: ReactNode; className?: string }) {
  const row = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<MenuEntry[]>([]);

  const layout = useCallback(() => {
    const box = content.current;
    const outer = row.current;
    if (!box || !outer) return;
    const hidden = new Set<HTMLElement>();
    box.querySelectorAll<HTMLElement>("[data-actions-folded]").forEach((element) => {
      element.style.display = "";
      element.removeAttribute("data-actions-folded");
    });
    const actions = Array.from(box.querySelectorAll<HTMLElement>(ACTION_SELECTOR)).filter(isAction);
    actions.forEach((element) => {
      if (!element.title) element.title = element.textContent?.trim() ?? "";
    });
    const fold = (shown: number) => {
      hidden.forEach((element) => {
        element.style.display = "";
        element.removeAttribute("data-actions-folded");
      });
      hidden.clear();
      actions.slice(shown).forEach((element) => {
        element.style.display = "none";
        hidden.add(element);
        // An emptied wrapper would leave a gap, so it folds too.
        let parent = element.parentElement;
        while (parent && parent !== box && Array.from(parent.children).every((child) => (child as HTMLElement).style.display === "none")) {
          parent.style.display = "none";
          hidden.add(parent);
          parent = parent.parentElement;
        }
      });
      hidden.forEach((element) => element.setAttribute("data-actions-folded", ""));
    };
    // An unmeasurable parent (width 0, as when hidden or in a test) never forces a button into the menu.
    const limit = outer.parentElement?.clientWidth || Number.POSITIVE_INFINITY;
    let shown = Math.min(2, actions.length);
    for (;;) {
      fold(shown);
      const needsMenu = actions.length > shown;
      if (shown <= 1 || box.offsetWidth + (needsMenu ? MENU_SLOT : 0) <= limit + 1) break;
      shown -= 1;
    }
    const folded = actions.slice(shown);
    setEntries((current) => {
      const next = folded.map((element, index) => describe(element, index));
      const same = current.length === next.length && current.every((item, index) => item.element === next[index].element && item.label === next[index].label && item.disabled === next[index].disabled && item.variant === next[index].variant);
      return same ? current : next;
    });
  }, []);

  useLayoutEffect(() => {
    layout();
  });

  useEffect(() => {
    const box = content.current;
    const outer = row.current;
    if (!box || !outer) return;
    // Buttons that load later (for example after data arrives) are placed as they appear.
    const mutations = new MutationObserver(layout);
    mutations.observe(box, { childList: true, subtree: true, characterData: true });
    let frame = 0;
    const resizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    });
    resizes?.observe(outer.parentElement ?? outer);
    return () => {
      mutations.disconnect();
      resizes?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [layout]);

  const normal = entries.filter((entry) => !entry.danger);
  const danger = entries.filter((entry) => entry.danger);
  return (
    <div ref={row} className={cn("page-actions tw:flex tw:max-w-full tw:min-w-0 tw:shrink-0 tw:flex-nowrap tw:items-center tw:gap-2", className)}>
      <div ref={content} className="tw:flex tw:w-max tw:flex-nowrap tw:items-center tw:gap-2">
        {children}
      </div>
      {entries.length > 0 ? (
        <DropdownMenu modal={false} onOpenChange={(open) => open && layout()}>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon" aria-label="More actions" title="More actions" className="tw:size-11 tw:shrink-0 tw:rounded-full tw:border-border tw:bg-card tw:text-foreground tw:shadow-xs tw:hover:border-primary/40 tw:hover:bg-primary/10 tw:hover:text-primary tw:aria-expanded:border-primary/40 tw:aria-expanded:bg-primary/10 tw:sm:size-10" />}>
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw:w-max tw:max-w-[calc(100vw-2rem)] tw:min-w-44">
            {[...normal, ...danger].map((entry, index) => (
              <div key={entry.key} role="presentation">
                {index === normal.length && normal.length > 0 && danger.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem variant={entry.danger ? "destructive" : "default"} disabled={entry.disabled} onClick={() => entry.element.click()} className={cn("tw:min-h-11 tw:whitespace-normal tw:sm:min-h-8", actionMenuClass(entry.variant))}>
                  {entry.icon ? <span aria-hidden="true" className="tw:flex tw:shrink-0 tw:[&_svg]:size-4" dangerouslySetInnerHTML={{ __html: entry.icon }} /> : labelIcon(entry.label)}
                  {entry.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
