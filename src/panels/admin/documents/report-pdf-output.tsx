"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import type { ReportPdfData } from "./report-pdf";

export async function createReportPdf(data: ReportPdfData): Promise<Blob> {
  const { buildReportPdf } = await import("./report-pdf");
  const bytes = await buildReportPdf(data);
  return new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
}

export function downloadReportPdf(file: Blob, fileName: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Let the browser finish starting the download before releasing its URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function ReportPdfPreview({ file, title, onClose }: { file: Blob; title: string; onClose: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    // The URL is only valid for the life of this preview.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="tw:sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Review the report, then open the PDF to print.</DialogDescription>
        </DialogHeader>
        {url ? <iframe src={url} title={`${title} PDF preview`} className="tw:h-[60dvh] tw:min-h-48 tw:w-full tw:rounded-lg tw:border tw:border-border" /> : null}
        <DialogFooter>
          {url ? <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "info" })}>
            <Printer aria-hidden="true" /> Open PDF to print
          </a> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
