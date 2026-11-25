"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { isImageDataUrl, isPdfDataUrl } from "@/shared/lib/file-data";
import { cn } from "@/shared/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";

/**
 * Clickable thumbnail for an uploaded image, with a full-size viewer (owner
 * instruction 2026-11-20). PDFs open in a new tab; records without the stored
 * file fall back to the file name so the row is never blank.
 */
export function ImagePreview({
  src,
  fileName,
  label,
  contentType,
  className,
}: {
  src?: string | null;
  fileName?: string | null;
  /** Name of the document, used in the viewer title and button label. */
  label: string;
  /** Media type of a private API address; data URLs carry their own type. */
  contentType?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const href = src ?? null;
  // api mode serves a private same-origin address; mock mode keeps a data URL.
  const remote = href !== null && (href.startsWith("/api/") || /^https?:\/\//.test(href));
  const pdf = isPdfDataUrl(href) || (remote && (contentType === "application/pdf" || /\.pdf$/i.test(fileName ?? "")));
  const image = isImageDataUrl(href) || (remote && (Boolean(contentType?.startsWith("image/")) || /\.(png|jpe?g|gif|webp)$/i.test(fileName ?? "")));

  if (pdf && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-sm tw:font-medium tw:text-primary tw:underline-offset-4 tw:hover:underline"
      >
        <FileText aria-hidden="true" className="tw:size-4" />
        {fileName ?? "Open PDF"}
      </a>
    );
  }
  if (!image || !href) {
    return <span className="tw:text-sm">{fileName ?? "—"}</span>;
  }
  return (
    <>
      <button
        type="button"
        aria-label={`View ${label} full size`}
        className={cn(
          "tw:group tw:inline-flex tw:max-w-full tw:cursor-zoom-in tw:overflow-hidden tw:rounded-md tw:border tw:border-border tw:bg-muted tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:focus-visible:outline-none",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- private API route or in-memory data URL, never a public asset */}
        <img
          src={href}
          alt={`${label} thumbnail`}
          className="tw:h-16 tw:w-24 tw:object-cover tw:transition-transform tw:group-hover:scale-[1.03]"
        />
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setZoomed(false);
        }}
      >
        <DialogContent className="tw:max-w-[min(64rem,calc(100%-2rem))] tw:gap-2 tw:p-2">
          <DialogTitle className="tw:px-2 tw:pt-1 tw:text-sm">{label}</DialogTitle>
          <div className="tw:flex tw:max-h-[78vh] tw:items-center tw:justify-center tw:overflow-auto tw:rounded-md tw:bg-muted/60">
            {/* eslint-disable-next-line @next/next/no-img-element -- private API route or in-memory data URL, never a public asset */}
            <img
              src={href}
              alt={label}
              title={zoomed ? "Click to fit the window" : "Click to view at full size"}
              onClick={() => setZoomed((current) => !current)}
              className={
                zoomed
                  ? "tw:max-w-none tw:cursor-zoom-out"
                  : "tw:max-h-[76vh] tw:max-w-full tw:cursor-zoom-in tw:object-contain"
              }
            />
          </div>
          {fileName ? <p className="tw:px-2 tw:pb-1 tw:text-xs tw:text-muted-foreground">{fileName}</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
