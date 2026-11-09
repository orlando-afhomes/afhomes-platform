"use client";

import { Eye, MoreHorizontal, Pause, Pencil, Play, Repeat } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

/** Row menu for Sales Network members; each entry appears only when its permission flag allows it. */
export function SalesNetworkRowActions({
  itemName,
  onView,
  onEdit,
  onTransfer,
  transferLabel = "Transfer",
  onChangeStatus,
  canEdit,
  canTransfer,
  canChangeStatus,
  canReactivate,
  status,
}: {
  itemName: string;
  onView?: () => void;
  onEdit: () => void;
  onTransfer: () => void;
  transferLabel?: string;
  onChangeStatus: () => void;
  canEdit: boolean;
  canTransfer: boolean;
  canChangeStatus: boolean;
  canReactivate: boolean;
  status: "active" | "inactive" | "suspended";
}) {
  const showStatus = canChangeStatus && (status === "active" || canReactivate);
  const reactivate = status !== "active";
  const itemClass = "tw:min-h-11 tw:sm:min-h-8";
  const hasItems = Boolean(onView) || canEdit || canTransfer || showStatus;
  if (!hasItems) return <div className="tw:flex tw:justify-end" />;

  return (
    <div className="tw:flex tw:justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label={`Actions for ${itemName}`} className="tw:size-11 tw:sm:size-8" />}
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="tw:min-w-44">
          {onView ? (
            <DropdownMenuItem onClick={onView} className={itemClass}>
              <Eye aria-hidden="true" /> View
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem onClick={onEdit} className={itemClass}>
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
          ) : null}
          {canTransfer ? (
            <DropdownMenuItem onClick={onTransfer} className={itemClass}>
              <Repeat aria-hidden="true" /> {transferLabel}
            </DropdownMenuItem>
          ) : null}
          {showStatus ? (
            <DropdownMenuItem variant={reactivate ? "default" : "destructive"} onClick={onChangeStatus} className={itemClass}>
              {reactivate ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />} {reactivate ? "Reactivate" : "Deactivate"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
