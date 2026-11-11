"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProfilePhotoUploader } from "@/shared/forms/modern";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function useCustomerIdImagePreview() {
  const [image, setImage] = useState<{ url: string; fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  }, []);

  const onClear = useCallback(() => {
    revokePreview();
    setImage(null);
    setError(null);
  }, [revokePreview]);

  useEffect(() => {
    // A page kept in the browser's back/forward cache may never unmount.
    window.addEventListener("pagehide", onClear);
    return () => {
      window.removeEventListener("pagehide", onClear);
      revokePreview();
    };
  }, [onClear, revokePreview]);

  function onSelect(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a non-empty image up to 5 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    revokePreview();
    previewUrl.current = url;
    setImage({ url, fileName: file.name });
    setError(null);
  }

  return { value: image?.url ?? null, fileName: image?.fileName, error, onSelect, onClear };
}

export type CustomerIdImagePreviewState = ReturnType<typeof useCustomerIdImagePreview>;

export function CustomerIdImagePreview({ preview, secondary = false }: { preview: CustomerIdImagePreviewState; secondary?: boolean }) {
  return (
    <ProfilePhotoUploader
      {...preview}
      document
      label="Government ID image (optional)"
      uploadLabel="Select image"
      ariaLabel={secondary ? "Select secondary holder Government ID image" : "Select Government ID image"}
      previewAlt={secondary ? "Secondary holder Government ID image preview" : "Government ID image preview"}
      removeLabel={secondary ? "Remove secondary holder Government ID image" : "Remove Government ID image"}
      accept={ACCEPTED_TYPES.join(",")}
      hint="JPEG, PNG, or WebP up to 5 MB. Preview is temporary and is discarded when you save or leave."
      className="tw:sm:col-span-2"
    />
  );
}
