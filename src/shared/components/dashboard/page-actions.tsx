"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import "./page-actions.css";

/**
 * Wrapper for the buttons in a page or card header. Under 640px the buttons that have an icon
 * become icon-only (see `page-actions.css`); this copies each button's text into its `title`
 * so a long press or hover still names it.
 */
export function PageActions({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const name = () => {
      root.querySelectorAll<HTMLElement>("a, button").forEach((element) => {
        const text = element.textContent?.trim();
        if (text && !element.title) element.title = text;
      });
    };
    name();
    // Buttons that load later (for example after data arrives) are named as they appear.
    const observer = new MutationObserver(name);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("page-actions tw:flex tw:max-w-full tw:min-w-0 tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-2", className)}>
      {children}
    </div>
  );
}
