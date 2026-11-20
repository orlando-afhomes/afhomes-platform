/**
 * Upload helpers for the mock phase. Business records live in browser memory
 * only (AGENTS.md section 4), so a selected file is read into a data URL that
 * survives navigation within the session and disappears on refresh.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

/** True when the stored data URL is an image the in-app viewer can render. */
export function isImageDataUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

/** True when the stored data URL is a PDF that opens in a new tab. */
export function isPdfDataUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("data:application/pdf");
}
