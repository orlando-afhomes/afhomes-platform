"use client";

import { useRef, useState } from "react";
import { Alert, Button } from "antd";
import { CameraOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import "./profile-photo-uploader.css";

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
 * Shared profile-photo dropzone used across the admin panel (sellers, staff).
 * Owns the file input, drag state, preview, and change/remove actions; the
 * owning form validates the file and owns the preview-URL lifecycle.
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

  const pickFile = (file: File | undefined) => {
    if (file) onSelect(file);
  };

  return (
    <div className={`afhomes-photo-uploader${className ? ` ${className}` : ""}`}>
      {label ? <div className="afhomes-photo-uploader__label">{label}</div> : null}
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        className={`afhomes-photo-uploader__dropzone${dragActive ? " afhomes-photo-uploader__dropzone--active" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
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
          <img src={value} alt="Selected profile photo preview" className="afhomes-photo-uploader__avatar" />
        ) : (
          <span className="afhomes-photo-uploader__avatar-placeholder" aria-hidden>
            <CameraOutlined />
          </span>
        )}
        <span className="afhomes-photo-uploader__text">
          <span className="afhomes-photo-uploader__title">
            <UploadOutlined aria-hidden /> {value ? (fileName ?? uploadLabel) : uploadLabel}
          </span>
          <span className="afhomes-photo-uploader__hint">{hint}</span>
        </span>
        {value ? (
          <span className="afhomes-photo-uploader__actions" onClick={(event) => event.stopPropagation()}>
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Change Photo
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined aria-hidden />}
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
            >
              Remove
            </Button>
          </span>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        aria-label={`${ariaLabel} file`}
        hidden
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error ? <Alert type="error" title={error} showIcon /> : null}
    </div>
  );
}
