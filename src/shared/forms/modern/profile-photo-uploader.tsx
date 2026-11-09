"use client";

import { useId, useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export type ProfilePhotoUploaderProps = {
  /** Preview URL (object URL or data URL). Null shows the placeholder. */
  value: string | null;
  /** Original file name shown after selection. */
  fileName?: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  error?: string | null;
  accept?: string;
  hint?: string;
  /** Optional visible caption above the dropzone. */
  label?: string;
  uploadLabel?: string;
  /** Defaults to "Upload profile photo" so every admin form shares one name. */
  ariaLabel?: string;
  className?: string;
};

/**
 * Profile-photo dropzone for admin forms (Tailwind). Owns the file input, drag
 * state, preview, and change/remove actions; the owning form validates the
 * file and owns the preview-URL lifecycle. Same props as the legacy uploader.
 */
export function ProfilePhotoUploader({
  value,
  fileName,
  onSelect,
  onClear,
  error,
  accept = "image/jpeg,image/png,image/webp",
  hint = "JPEG, PNG, WebP, max 5MB.",
  label,
  uploadLabel = "Upload Photo",
  ariaLabel = "Upload profile photo",
  className,
}: ProfilePhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const errorId = useId();

  const pickFile = (file: File | undefined) => {
    if (file) onSelect(file);
  };

  return (
    <div className={cn("tw:flex tw:flex-col tw:gap-1.5", className)}>
      {label ? <span className="tw:text-sm tw:font-medium">{label}</span> : null}
      <div
        className={cn(
          "tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-dashed tw:border-input tw:p-3",
          dragActive && "tw:border-primary tw:bg-primary/5",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          pickFile(event.dataTransfer.files?.[0]);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- data/object URL preview
          <img src={value} alt="Selected profile photo preview" className="tw:size-14 tw:rounded-full tw:object-cover" />
        ) : (
          <span aria-hidden="true" className="tw:flex tw:size-14 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted tw:text-muted-foreground">
            <Camera />
          </span>
        )}
        <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
          <span className="tw:truncate tw:text-sm tw:font-medium">{value ? (fileName ?? "Photo selected") : "No photo selected"}</span>
          <span className="tw:text-xs tw:text-muted-foreground">{hint}</span>
        </div>
        <div className="tw:flex tw:flex-wrap tw:gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            className="tw:min-h-11 tw:sm:min-h-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload aria-hidden="true" /> {value ? "Change Photo" : uploadLabel}
          </Button>
          {value ? (
            <Button type="button" variant="destructive" className="tw:min-h-11 tw:sm:min-h-8" onClick={onClear}>
              <Trash2 aria-hidden="true" /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        aria-label={`${ariaLabel} file`}
        aria-describedby={error ? errorId : undefined}
        hidden
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error ? (
        <p id={errorId} role="alert" className="tw:text-sm tw:text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
