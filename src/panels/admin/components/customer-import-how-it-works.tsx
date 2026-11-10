"use client";

import { useId } from "react";
import { FileText, HardDrive, Layers } from "lucide-react";

const BODY_COPY =
  "Each valid row becomes a customer draft. Staff then open the draft, confirm the details, tick both certifications and submit it. Rows that may duplicate an existing customer are skipped and listed for review; nothing is merged or overwritten. Nothing is saved until you confirm.";

/** Explainer card for the import flow with supported-format and size summary cards. */
export function CustomerImportHowItWorks() {
  const titleId = useId();
  return (
    <div className="customer-import-how-it-works tw:grid tw:gap-4 tw:lg:grid-cols-[minmax(0,1fr)_15rem]">
      <section
        aria-labelledby={titleId}
        className="tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-border tw:bg-secondary/40 tw:p-5 tw:shadow-(--shadow-soft) tw:sm:flex-row tw:sm:items-center"
      >
        <span
          aria-hidden="true"
          className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-secondary tw:text-secondary-foreground"
        >
          <Layers className="tw:size-5" />
        </span>
        <span aria-hidden="true" className="tw:hidden tw:w-px tw:self-stretch tw:bg-border tw:sm:block" />
        <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-2 tw:lg:flex-row tw:lg:items-start tw:lg:gap-6">
          <h2 id={titleId} className="tw:shrink-0 tw:text-base tw:font-semibold tw:whitespace-nowrap">
            How import works
          </h2>
          <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{BODY_COPY}</p>
        </div>
      </section>
      <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2 tw:lg:grid-cols-1 tw:lg:gap-3">
        <div className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4 tw:shadow-(--shadow-soft)">
          <span
            aria-hidden="true"
            className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-secondary tw:text-secondary-foreground"
          >
            <FileText className="tw:size-4" />
          </span>
          <div>
            <p className="tw:m-0 tw:text-sm tw:font-semibold">Supported formats</p>
            <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">XLSX, CSV</p>
          </div>
        </div>
        <div className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4 tw:shadow-(--shadow-soft)">
          <span
            aria-hidden="true"
            className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-secondary tw:text-secondary-foreground"
          >
            <HardDrive className="tw:size-4" />
          </span>
          <div>
            <p className="tw:m-0 tw:text-sm tw:font-semibold">Max file size</p>
            <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">10 MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
