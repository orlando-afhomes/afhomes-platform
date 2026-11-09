"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ToneBadge, type BadgeTone } from "@/shared/components/modern/status-badge";

export type LinkedRecordState =
  | "linked"
  | "not-linked"
  | "missing"
  | "restricted"
  | "conflicting"
  | "ambiguous"
  | "incomplete";

const STATE_LABELS: Record<LinkedRecordState, string> = {
  linked: "Linked",
  "not-linked": "Not linked",
  missing: "Missing",
  restricted: "Restricted",
  conflicting: "Conflicting",
  ambiguous: "Ambiguous",
  incomplete: "Incomplete",
};

const STATE_TONES: Record<LinkedRecordState, BadgeTone> = {
  linked: "success",
  "not-linked": "neutral",
  missing: "warning",
  restricted: "neutral",
  conflicting: "danger",
  ambiguous: "warning",
  incomplete: "warning",
};

export type LinkedRecordItem = {
  key: string;
  label: string;
  state: LinkedRecordState;
  content?: ReactNode;
  href?: string;
  linkLabel?: string;
};

export function LinkedBusinessRecords({ items }: { items: LinkedRecordItem[] }) {
  return (
    <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:p-0">
      {items.map((item) => (
        <li key={item.key} className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-1 tw:border-b tw:border-border tw:py-2 tw:last:border-b-0">
          <span className="tw:w-40 tw:shrink-0 tw:font-medium tw:text-muted-foreground">{item.label}</span>
          <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-wrap tw:items-center tw:gap-2">
            {item.content ?? "—"}
            {item.href ? (
              <Link href={item.href} className="tw:text-primary tw:underline-offset-4 tw:hover:underline">
                {item.linkLabel ?? "View"}
              </Link>
            ) : null}
          </span>
          <ToneBadge tone={STATE_TONES[item.state]}>{STATE_LABELS[item.state]}</ToneBadge>
        </li>
      ))}
    </ul>
  );
}
