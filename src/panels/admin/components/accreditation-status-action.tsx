"use client";

import { App as AntdApp, Button, Dropdown, Input, Tag } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined } from "@ant-design/icons";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { AccreditationStatusRequest } from "@/data/contracts/accreditation-repository";
import { transitionRequiresReason } from "@/modules/accreditation/transitions";
import {
  ACCREDITATION_ACTION_LABELS,
  resolveAccreditationDisplay,
} from "@/modules/sales-network/display";
import { useIssuePendingAccreditation, useUpdateAccreditationStatus } from "@/data/queries";
import { showError, showSuccess } from "@/shared/utils/feedback";
import "./accreditation-status-action.css";

function StatusDot({ status }: { status: "pending" | "accredited" | "cancelled" | "expired" }) {
  return <span className={`sales-members-table__status-dot sales-members-table__status-dot--${status}`} aria-hidden />;
}

/**
 * Permission-controlled accreditation status action shared by the Members
 * table and the member detail page. Renders a colored action dropdown for
 * mutable records, a truthful read-only Tag otherwise, and a gated
 * Set Accreditation control when no record exists.
 */
export function AccreditationStatusAction({
  records,
  aaNumber,
  canEdit,
  memberId,
  memberName,
}: {
  records: readonly AccreditationRecord[] | undefined;
  aaNumber: string | null;
  canEdit: boolean;
  memberId: string;
  memberName: string;
}) {
  const updateStatus = useUpdateAccreditationStatus();
  const issuePending = useIssuePendingAccreditation();
  const { modal } = AntdApp.useApp();
  const state = resolveAccreditationDisplay(records);
  const busy = updateStatus.isPending || issuePending.isPending;

  if (state.kind === "none") {
    if (!canEdit) return <Tag>No record</Tag>;
    return (
      <Button
        size="small"
        loading={issuePending.isPending}
        disabled={busy}
        className="sales-members-table__status-button"
        onClick={() => {
          modal.confirm({
            title: "Create Pending Accreditation",
            content: `Create a pending accreditation with automatic AA issuance for seller ${memberName}?`,
            okText: "Create",
            cancelText: "Cancel",
            // Resolve (never reject) so the confirm closes on completion;
            // success/error feedback follows in its own dialog.
            onOk: () =>
              issuePending.mutateAsync(memberId).then(
                (record) => {
                  void showSuccess("Pending accreditation created.", `Issued ${record.aaNumber ?? "AA number"}. Accreditation stays Pending until approval.`);
                },
                (err: unknown) => {
                  void showError("Creation failed.", err instanceof Error ? err.message : "Failed to create accreditation.");
                },
              ),
          });
        }}
      >
        Set Accreditation
      </Button>
    );
  }

  if (state.kind === "ambiguous") {
    return <Tag color="gold">Review records</Tag>;
  }

  if (state.kind === "static" || !canEdit) {
    const label = state.kind === "static" ? state.label : ACCREDITATION_ACTION_LABELS[state.value];
    return <Tag color={state.kind === "static" ? state.color : state.value === "active" ? "green" : "gold"}>{label}</Tag>;
  }

  const requestUpdate = (requested: AccreditationStatusRequest) => {
    if (requested === state.value || busy) return;
    const sellerRef = aaNumber ?? "No AA issued";
    const needsReason = transitionRequiresReason(state.value, requested);
    let reasonText = "";
    const dialog =
      requested === "cancel"
        ? {
            title: state.value === "pending" ? "Cancel Pending Accreditation?" : "Cancel Accreditation?",
            intro: `This will cancel the ${state.value === "pending" ? "pending " : ""}accreditation for seller ${memberName} (${sellerRef}). The seller's account, member record, Team, Parent, and existing AA number will remain unchanged.`,
            okText: "Confirm Cancellation",
            cancelText: state.value === "pending" ? "Keep Pending" : "Keep Accredited",
            successTitle: "Accreditation cancelled.",
            successText: "Status is now Cancelled.",
            errorTitle: "Cancellation failed.",
          }
        : requested === "pending"
          ? {
              title: "Revert Accreditation to Pending?",
              intro: `Change accreditation status from Accredited to Pending for seller ${memberName} (${sellerRef})? The seller will no longer qualify for accreditation-dependent activities. Historical records, Team, Parent, and AA number remain unchanged.`,
              okText: "Confirm Reversal",
              cancelText: "Keep Accredited",
              successTitle: "Accreditation reverted.",
              successText: "Status is now Pending.",
              errorTitle: "Reversal failed.",
            }
          : {
              title: "Update Accreditation Status",
              intro: `Change accreditation status from ${ACCREDITATION_ACTION_LABELS[state.value]} to ${ACCREDITATION_ACTION_LABELS[requested]} for seller ${sellerRef}?`,
              okText: "Update",
              cancelText: "Cancel",
              successTitle: "Accreditation status updated.",
              successText: `Status is now ${ACCREDITATION_ACTION_LABELS[requested]}.`,
              errorTitle: "Status update failed.",
            };
    modal.confirm({
      title: dialog.title,
      content: (
        <div className="sales-members-table__confirm">
          <p>{dialog.intro}</p>
          {needsReason ? (
            <>
              <label className="sales-members-table__confirm-reason" htmlFor={`accreditation-reason-${state.recordId}`}>Reason *</label>
              <Input.TextArea
                id={`accreditation-reason-${state.recordId}`}
                rows={3}
                placeholder="Enter the reason for this change"
                onChange={(event) => {
                  reasonText = event.target.value;
                }}
              />
            </>
          ) : null}
        </div>
      ),
      okText: dialog.okText,
      cancelText: dialog.cancelText,
      // Resolve (never reject) so the confirm closes on completion, except
      // when the required reason is missing (confirm stays open); success
      // and error feedback follows in its own dialog.
      onOk: () => {
        if (needsReason && !reasonText.trim()) {
          void showError("Reason required.", "Provide a reason for this status change.");
          return Promise.reject(new Error("Reason required."));
        }
        return updateStatus
          .mutateAsync({ recordId: state.recordId, requested, expectedPrevious: state.value, reason: needsReason ? reasonText.trim() : undefined })
          .then(
            () => {
              void showSuccess(dialog.successTitle, dialog.successText);
            },
            (err: unknown) => {
              void showError(dialog.errorTitle, err instanceof Error ? err.message : "Failed to update status.");
            },
          );
      },
    });
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "pending",
      label: (<span className="sales-members-table__menu-label"><StatusDot status="pending" />{ACCREDITATION_ACTION_LABELS.pending}</span>),
      disabled: state.value === "pending",
      title: state.value === "pending" ? "Current status" : "Revert to Pending (reason required)",
    },
    {
      key: "active",
      label: (<span className="sales-members-table__menu-label"><StatusDot status="accredited" />{ACCREDITATION_ACTION_LABELS.active}</span>),
      disabled: state.value === "active",
      title: state.value === "active" ? "Current status" : undefined,
    },
    {
      key: "cancel",
      label: (<span className="sales-members-table__menu-label"><StatusDot status="cancelled" />{ACCREDITATION_ACTION_LABELS.cancel}</span>),
      disabled: state.value !== "pending" && state.value !== "active",
      title: state.value === "pending" || state.value === "active" ? "Cancel this accreditation (reason required)" : "Pending or active only",
    },
    {
      key: "expired",
      label: (<span className="sales-members-table__menu-label"><StatusDot status="expired" />{ACCREDITATION_ACTION_LABELS.expired}</span>),
      disabled: true,
      title: "Expiry is date-derived",
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: ({ key }) => requestUpdate(key as AccreditationStatusRequest) }}
      trigger={["click"]}
      disabled={busy}
    >
      <Button
        size="small"
        loading={busy}
        className={`sales-members-table__status-button ${state.value === "active" ? "sales-members-table__status-button--accredited" : "sales-members-table__status-button--pending"}`}
        aria-label={`Accreditation status: ${ACCREDITATION_ACTION_LABELS[state.value]}. Activate to change.`}
      >
        {ACCREDITATION_ACTION_LABELS[state.value]} <DownOutlined aria-hidden />
      </Button>
    </Dropdown>
  );
}
