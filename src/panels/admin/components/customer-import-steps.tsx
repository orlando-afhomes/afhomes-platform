"use client";

import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { CloudUpload, FileText } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

/** Numbered import step card with a title, description, and right-aligned actions. */
export function TemplateStep({
  step,
  title,
  description,
  actions,
  connector = false,
  children,
}: {
  step: number;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  connector?: boolean;
  children?: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="customer-import-step tw:relative tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-5 tw:shadow-(--shadow-soft) tw:sm:flex-row"
    >
      <span
        aria-hidden="true"
        className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-secondary tw:text-sm tw:font-bold tw:text-secondary-foreground"
      >
        {step}
      </span>
      <div className="tw:min-w-0 tw:flex-1">
        <h2 id={titleId} className="tw:text-base tw:font-semibold">
          <span className="tw:sr-only">Step {step}: </span>
          {title}
        </h2>
        {description ? <div className="tw:mt-1 tw:text-sm tw:text-muted-foreground">{description}</div> : null}
        {children}
      </div>
      {actions ? (
        <div className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-2 tw:sm:self-center">{actions}</div>
      ) : null}
      {connector ? (
        <span
          aria-hidden="true"
          className="customer-import-step__connector tw:absolute tw:top-14 tw:-bottom-6 tw:left-[37px] tw:hidden tw:border-l tw:border-dashed tw:border-border tw:sm:block"
        />
      ) : null}
    </section>
  );
}

/** Dashed dropzone with click-to-browse and drag-drop for the customer import file. */
export function UploadDropzone({
  inputId,
  accept,
  disabled,
  reading,
  error,
  onFile,
}: {
  inputId: string;
  accept: string;
  disabled?: boolean;
  reading: boolean;
  error?: string | null;
  onFile: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const errorId = `${inputId}-error`;
  const busy = disabled || reading;

  const browse = () => {
    inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    onFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="customer-import-dropzone tw:mt-4">
      <Input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={busy}
        tabIndex={-1}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        className="tw:sr-only"
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "tw:flex tw:flex-col tw:items-center tw:rounded-xl tw:border tw:border-dashed tw:px-6 tw:py-10 tw:text-center tw:transition-colors tw:motion-reduce:transition-none",
          dragging ? "tw:border-primary tw:bg-secondary/60" : "tw:border-input tw:bg-muted/40",
        )}
      >
        <CloudUpload aria-hidden="true" className="tw:size-10 tw:text-primary" />
        <p className="tw:m-0 tw:mt-3 tw:text-sm tw:font-semibold tw:text-foreground">Drag and drop your file here</p>
        <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">or</p>
        <Button type="button" variant="outline" disabled={busy} onClick={browse} className="tw:mt-2 tw:min-h-11 tw:sm:min-h-8">
          <FileText aria-hidden="true" /> Choose File
        </Button>
        <p className="tw:m-0 tw:mt-3 tw:text-xs tw:text-muted-foreground">
          Accepted formats: .xlsx, .csv <span aria-hidden="true">|</span> Maximum size: 10 MB
        </p>
      </div>
      {reading ? (
        <p role="status" className="tw:mt-2 tw:text-sm tw:text-muted-foreground">
          Reading the file…
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="tw:mt-2 tw:text-sm tw:text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
