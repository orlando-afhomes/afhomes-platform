"use client";

import Link from "next/link";
import { Tag } from "antd";
import type { ReactNode } from "react";

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

const STATE_COLORS: Record<LinkedRecordState, string | undefined> = {
  linked: "green",
  "not-linked": undefined,
  missing: "orange",
  restricted: undefined,
  conflicting: "red",
  ambiguous: "gold",
  incomplete: "orange",
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
    <ul className="linked-business-records">
      {items.map((item) => (
        <li key={item.key} className="linked-business-records__row">
          <span className="linked-business-records__label">{item.label}</span>
          <span className="linked-business-records__value">
            {item.content ?? "—"}
            {item.href ? (
              <Link href={item.href} className="linked-business-records__link">
                {item.linkLabel ?? "View"}
              </Link>
            ) : null}
          </span>
          <Tag color={STATE_COLORS[item.state]} className="linked-business-records__state">
            {STATE_LABELS[item.state]}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
