import Swal from "sweetalert2";

const CONFIRM_COLOR = "#174f3b";
const DANGER_COLOR = "#a63a32";

/**
 * SweetAlert2 confirmation with a loading spinner on the confirm button
 * while `action` runs, followed by a success or failure modal.
 * Returns true only when the action ran and succeeded.
 */
export async function confirmAndRun(input: {
  title: string;
  text: string;
  confirmText?: string;
  danger?: boolean;
  action: () => void | Promise<void>;
  successTitle: string;
  successText?: string;
  errorTitle: string;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: input.title,
    text: input.text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: input.confirmText ?? "Confirm",
    cancelButtonText: "Cancel",
    confirmButtonColor: input.danger ? DANGER_COLOR : CONFIRM_COLOR,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async (): Promise<{ ok: boolean; message?: string }> => {
      try {
        await input.action();
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Request failed." };
      }
    },
  });
  const value = result.value as { ok: boolean; message?: string } | undefined;
  if (result.isConfirmed && value?.ok) {
    await Swal.fire({
      title: input.successTitle,
      text: input.successText,
      icon: "success",
      confirmButtonColor: CONFIRM_COLOR,
    });
    return true;
  }
  if (result.isConfirmed && value && !value.ok) {
    await Swal.fire({
      title: input.errorTitle,
      text: value.message,
      icon: "error",
      confirmButtonColor: CONFIRM_COLOR,
    });
  }
  return false;
}

/** Plain confirmation without running an action (e.g. before saving edits). */
export async function confirmAction(input: {
  title: string;
  text: string;
  confirmText?: string;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: input.title,
    text: input.text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: input.confirmText ?? "Confirm",
    cancelButtonText: "Cancel",
    confirmButtonColor: CONFIRM_COLOR,
  });
  return result.isConfirmed;
}

/** Success modal after a mutation that had no pre-confirmation (e.g. create). */
export async function showSuccess(title: string, text?: string): Promise<void> {
  await Swal.fire({ title, text, icon: "success", confirmButtonColor: CONFIRM_COLOR });
}

/** Failure modal after a mutation (e.g. duplicate name, blocked delete). */
export async function showError(title: string, text?: string): Promise<void> {
  await Swal.fire({ title, text, icon: "error", confirmButtonColor: CONFIRM_COLOR });
}
