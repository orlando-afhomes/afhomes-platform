import type { MouseEvent } from "react";

/**
 * Shared row-click guard for directory tables: a row opens its detail view,
 * but clicks from controls inside the row (action menus, links, inputs,
 * selects, pickers) keep their own behavior.
 */
export function isRowControlClick(event: MouseEvent): boolean {
  const target = event.target as HTMLElement | null;
  return Boolean(
    target?.closest?.(
      "button, a, input, select, textarea, [role='menuitem'], [role='menu'], .ant-select, .ant-picker, .ant-dropdown-trigger",
    ),
  );
}
