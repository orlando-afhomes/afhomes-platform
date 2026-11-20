"use client";

import { useCallback, useState } from "react";
import { ProfilePhotoUploader } from "@/shared/forms/modern";
import type { CustomerImage } from "@/modules/customers/types";
import { readFileAsDataUrl } from "@/shared/lib/file-data";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Government ID image for the application wizard. The selected file is read
 * into a data URL at once, so the image is saved with the customer record and
 * can still be viewed (document view and Finance review) after submission.
 * It lives in the browser-scoped mock store only and disappears on refresh.
 */
export function useCustomerIdImagePreview() {
  const [image, setImage] = useState<{ url: string; fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClear = useCallback(() => {
    setImage(null);
    setError(null);
  }, []);

  function onSelect(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a non-empty image up to 5 MB.");
      return;
    }
    setError(null);
    readFileAsDataUrl(file).then(
      (url) => setImage({ url, fileName: file.name }),
      () => setError("Could not read the selected image. Choose the file again."),
    );
  }

  return { value: image?.url ?? null, fileName: image?.fileName, error, onSelect, onClear };
}

export type CustomerIdImagePreviewState = ReturnType<typeof useCustomerIdImagePreview>;

/** The image as it is stored on the customer record, or undefined when none was chosen. */
export function toCustomerImage(preview: CustomerIdImagePreviewState): CustomerImage | undefined {
  return preview.value && preview.fileName ? { dataUrl: preview.value, fileName: preview.fileName } : undefined;
}

export function CustomerIdImagePreview({ preview, secondary = false }: { preview: CustomerIdImagePreviewState; secondary?: boolean }) {
  return (
    <ProfilePhotoUploader
      {...preview}
      document
      uploadVariant="default"
      label="Government ID image (optional)"
      uploadLabel="Select image"
      ariaLabel={secondary ? "Select secondary holder Government ID image" : "Select Government ID image"}
      previewAlt={secondary ? "Extra cardholder Government ID image preview" : "Government ID image preview"}
      removeLabel={secondary ? "Remove secondary holder Government ID image" : "Remove Government ID image"}
      accept={ACCEPTED_TYPES.join(",")}
      hint="JPEG, PNG, or WebP up to 5 MB."
      className="tw:sm:col-span-2"
    />
  );
}
