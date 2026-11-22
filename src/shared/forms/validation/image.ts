/** Profile pictures: images only, 2MB or smaller (same rule as the staff My Account picture). */
export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Checks a picked file before it is read. */
export function validateProfileImageFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return "Unsupported image format.";
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return "Image must be 2MB or smaller.";
  return null;
}

/** Re-checks a stored data URL at the repository boundary; the file size is the base64 body length times 3/4, minus its "=" padding. */
export function validateProfileImageDataUrl(dataUrl: string): string | null {
  // A non-empty, correctly padded base64 body: groups of 4, with "=" only at the very end.
  const match = /^data:image\/[a-z0-9.+-]+;base64,((?:[a-z0-9+/]{4})+(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?|[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)$/i.exec(dataUrl);
  if (!match) return "Unsupported image format.";
  const body = match[1];
  const padding = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  if (Math.floor((body.length * 3) / 4) - padding > PROFILE_IMAGE_MAX_BYTES) return "Image must be 2MB or smaller.";
  return null;
}
