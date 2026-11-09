import type { ConfirmRunInput } from "@/shared/components/modern/use-confirm-run";

export type LinkedAccountAction = "suspended" | "deactivated";

export const LINKED_ACCOUNT_ACTION_LABELS: Record<LinkedAccountAction, string> = {
  suspended: "Suspend account",
  deactivated: "Deactivate account",
};

export function linkedAccountActions(allowedStatuses: readonly string[]): LinkedAccountAction[] {
  return allowedStatuses.filter((status): status is LinkedAccountAction => status === "suspended" || status === "deactivated");
}

/**
 * Staff/Employees authority over a linked non-protected account: suspend or
 * deactivate only (doc 01 §7), always confirmed first. The repository
 * re-checks authority on every call.
 */
export function confirmLinkedAccountStatus(
  confirmRun: (input: ConfirmRunInput) => void,
  staffName: string,
  status: LinkedAccountAction,
  run: () => Promise<unknown>,
) {
  confirmRun({
    title: `${LINKED_ACCOUNT_ACTION_LABELS[status]} for ${staffName}?`,
    description: "The account loses access immediately. Only an Administrator or Super Administrator can reactivate it.",
    confirmText: LINKED_ACCOUNT_ACTION_LABELS[status],
    danger: true,
    action: async () => {
      await run();
    },
    successTitle: "Account status updated.",
    errorTitle: "Status update failed.",
  });
}
