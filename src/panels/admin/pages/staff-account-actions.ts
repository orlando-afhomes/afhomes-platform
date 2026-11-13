import type { ConfirmRunInput } from "@/shared/components/modern/use-confirm-run";

export type LinkedAccountAction = "active" | "suspended" | "deactivated";

export const LINKED_ACCOUNT_ACTION_LABELS: Record<LinkedAccountAction, string> = {
  active: "Activate account",
  suspended: "Suspend account",
  deactivated: "Deactivate account",
};

export function linkedAccountActions(allowedStatuses: readonly string[]): LinkedAccountAction[] {
  return allowedStatuses.filter((status): status is LinkedAccountAction => status === "active" || status === "suspended" || status === "deactivated");
}

/**
 * Staff/Employees authority over a linked non-protected account: activate,
 * suspend or deactivate (doc 01 §7; owner ruling 2026-11-12, A4), always
 * confirmed first. The repository re-checks authority on every call and
 * refuses to activate an Administrator account for HR.
 */
export function confirmLinkedAccountStatus(
  confirmRun: (input: ConfirmRunInput) => void,
  staffName: string,
  status: LinkedAccountAction,
  run: () => Promise<unknown>,
) {
  confirmRun({
    title: `${LINKED_ACCOUNT_ACTION_LABELS[status]} for ${staffName}?`,
    description:
      status === "active"
        ? "The account regains access to the system."
        : "The account loses access immediately. It can be turned back on later by an authorized user.",
    confirmText: LINKED_ACCOUNT_ACTION_LABELS[status],
    danger: status !== "active",
    action: async () => {
      await run();
    },
    successTitle: "Account status updated.",
    errorTitle: "Status update failed.",
  });
}
