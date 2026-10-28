"use client";

import { Tag } from "antd";
import { formatStatusLabel } from "@/shared/utils/input-sanitizers";

const DEFAULT_STATUS_COLORS: Record<string, string | undefined> = {
  active: "green",
  accredited: "green",
  approved: "green",
  valid: "green",
  eligible: "green",
  pending: "gold",
  suspended: "orange",
  revoked: "red",
  cancelled: "red",
  rejected: "red",
};

/**
 * Consistent status badge used throughout the admin UI. Labels always start
 * with a capital letter; colors follow the shared mapping unless a caller
 * passes an explicit override. Text is never conveyed by color alone.
 */
export function StatusBadge({
  status,
  color,
  className,
}: {
  status: string;
  color?: string;
  className?: string;
}) {
  const normalized = status.trim().toLowerCase();
  return (
    <Tag color={color ?? DEFAULT_STATUS_COLORS[normalized]} className={className}>
      {formatStatusLabel(status)}
    </Tag>
  );
}
