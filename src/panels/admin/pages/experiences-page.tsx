"use client";

import { useMemo, useState } from "react";
import { Archive, ExternalLink, Mountain, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useExperiences, useSaveExperience, useSetExperiencePublished } from "@/data/experience-queries";
import type { ExperienceInput } from "@/data/contracts/experience-repository";
import type { Experience, ExperienceHighlight, ExperienceStatusTone } from "@/modules/experiences/types";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { ToneBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { SelectField, TextAreaField, TextField } from "@/shared/forms/modern";
import { useOperation } from "@/data/business-queries";
import { formatDate } from "@/shared/lib/format-date";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";

const TONE_OPTIONS: ReadonlyArray<{ value: ExperienceStatusTone; label: string }> = [
  { value: "live", label: "Open now" },
  { value: "upcoming", label: "Opening soon" },
  { value: "progress", label: "In development" },
];

const toneLabel = (tone: ExperienceStatusTone) => TONE_OPTIONS.find((item) => item.value === tone)?.label ?? tone;

/** Public website Experiences editor. A valid save publishes immediately; archive hides without deleting. */
export function ExperiencesPage() {
  const experiences = useExperiences();
  const canManage = useOperation("experiences.manage");
  const setPublished = useSetExperiencePublished();
  const { confirmRun, dialog } = useConfirmRun();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const visible = useMemo(
    () => (experiences.data ?? []).filter((item) =>
      (stateFilter === "all" || (stateFilter === "published" ? item.published : !item.published))
      && matchesSearch(search, item.title, item.slug, item.category)),
    [experiences.data, search, stateFilter],
  );
  const detail = (experiences.data ?? []).find((item) => item.id === detailId) ?? null;

  const togglePublished = (experience: Experience) => {
    const archiving = experience.published;
    confirmRun({
      title: archiving ? `Archive ${experience.title}?` : `Restore ${experience.title}?`,
      description: archiving
        ? "The card disappears from the public website and its own page stops being offered. The content is kept and can be restored."
        : "The experience appears on the public website again.",
      confirmText: archiving ? "Archive" : "Restore",
      danger: archiving,
      tone: archiving ? "destructive" : "success",
      action: () => setPublished.mutateAsync({ id: experience.id, published: !archiving }),
      successTitle: archiving ? "Experience archived." : "Experience restored.",
      errorTitle: archiving ? "Could not archive the experience." : "Could not restore the experience.",
    });
  };

  const columns = useMemo<ColumnDef<Experience, unknown>[]>(
    () => [
      { id: "title", header: "Experience", cell: ({ row }) => <span className="tw:font-semibold">{row.original.title}</span> },
      { id: "address", header: "Page Address", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `/experiences/${row.original.slug}` },
      { id: "category", header: "Category", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.category },
      {
        id: "state",
        header: "State",
        cell: ({ row }) => row.original.published
          ? <ToneBadge tone="success">Published</ToneBadge>
          : <ToneBadge tone="neutral">Archived</ToneBadge>,
      },
      { id: "updated", header: "Last Updated", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => formatDate(row.original.updatedAt.slice(0, 10)) },
    ],
    [],
  );

  return (
    <AdminPage
      anyOf={["experiences"]}
      title="Experiences"
      crumbs={[{ label: "Experiences" }]}
      actions={canManage ? (
        <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" /> New experience
        </Button>
      ) : undefined}
    >
      <QueryState isLoading={experiences.isLoading} error={experiences.error}>
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchLabel="Search experiences"
          filters={[{
            label: "State filter",
            value: stateFilter,
            onChange: setStateFilter,
            options: [{ value: "all", label: "All experiences" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }],
          }]}
        />
        <DataTable
          data={visible}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText={(experiences.data ?? []).length === 0 ? "No experiences." : "No experiences match the filters."}
          caption="Public Experiences"
          onRowOpen={(row) => setDetailId(row.id)}
          getRowLabel={(row) => `Open ${row.title}`}
          rowActions={canManage ? (row) => (
            <RowActionsMenu
              itemName={row.title}
              onEdit={() => setEditing(row)}
              extraItems={[{
                key: row.published ? "archive" : "restore",
                label: row.published ? "Archive" : "Restore",
                tone: row.published ? "warning" : "success",
                onClick: () => togglePublished(row),
              }]}
            />
          ) : undefined}
        />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.title ?? "Experience"}
        subtitle={detail ? `/experiences/${detail.slug}` : undefined}
        icon={<Mountain />}
        badge={detail ? (detail.published ? <ToneBadge tone="success">Published</ToneBadge> : <ToneBadge tone="neutral">Archived</ToneBadge>) : undefined}
        sections={detail ? [
          {
            title: "Public content",
            rows: [
              { label: "Category", value: detail.category },
              { label: "Status", value: `${detail.status} · ${toneLabel(detail.statusTone)}` },
              { label: "Summary", value: detail.summary, wide: true },
              { label: "Overview", value: detail.overview, wide: true },
              { label: "Image", value: detail.image.src, wide: true },
              { label: "Image description", value: detail.image.alt, wide: true },
            ],
          },
          ...(detail.highlights.length > 0 ? [{
            title: "Highlights",
            rows: detail.highlights.map((item) => ({ label: item.title, value: item.text, wide: true })),
          }] : []),
        ] : []}
        history={detail ? [{ key: detail.updatedAt, when: `Last updated ${formatDate(detail.updatedAt.slice(0, 10))}`, text: detail.category }] : []}
        footer={detail && canManage ? (
          <>
            <a
              href={`/experiences/${detail.slug}`}
              className="tw:inline-flex tw:min-h-11 tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-border tw:px-3 tw:text-sm tw:font-semibold tw:text-foreground tw:sm:min-h-8"
            >
              <ExternalLink aria-hidden="true" className="tw:size-4" /> Open public page
            </a>
            <Button type="button" variant="warning" onClick={() => { setEditing(detail); setDetailId(null); }}><Pencil aria-hidden="true" /> Edit</Button>
            {detail.published ? (
              <Button type="button" variant="destructive" onClick={() => togglePublished(detail)}><Archive aria-hidden="true" /> Archive</Button>
            ) : (
              <Button type="button" variant="success" onClick={() => togglePublished(detail)}><RotateCcw aria-hidden="true" /> Restore</Button>
            )}
          </>
        ) : undefined}
      />
      {creating || editing ? (
        <ExperienceDialog
          key={editing?.id ?? "new-experience"}
          experience={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      ) : null}
      {dialog}
    </AdminPage>
  );
}

function ExperienceDialog({ experience, onClose }: { experience: Experience | null; onClose: () => void }) {
  const save = useSaveExperience();
  const [title, setTitle] = useState(experience?.title ?? "");
  const [slug, setSlug] = useState(experience?.slug ?? "");
  const [category, setCategory] = useState(experience?.category ?? "");
  const [summary, setSummary] = useState(experience?.summary ?? "");
  const [status, setStatus] = useState(experience?.status ?? "");
  const [statusTone, setStatusTone] = useState<ExperienceStatusTone>(experience?.statusTone ?? "upcoming");
  const [imageSrc, setImageSrc] = useState(experience?.image.src ?? "");
  const [imageAlt, setImageAlt] = useState(experience?.image.alt ?? "");
  const [overview, setOverview] = useState(experience?.overview ?? "");
  const [highlights, setHighlights] = useState<ExperienceHighlight[]>(experience?.highlights.map((item) => ({ ...item })) ?? []);
  const [error, setError] = useState<string | undefined>();

  const setHighlight = (index: number, patch: Partial<ExperienceHighlight>) => {
    setHighlights((current) => current.map((item, position) => (position === index ? { ...item, ...patch } : item)));
    setError(undefined);
  };

  const submit = async () => {
    const input: ExperienceInput = { title, slug, category, summary, status, statusTone, imageSrc, imageAlt, overview, highlights };
    try {
      const saved = await save.mutateAsync({ id: experience?.id, experience: input });
      const state = saved.published ? " and published" : " (still archived)";
      toast.success(experience ? `Experience updated${state}.` : "Experience added and published.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return (
    <FormDialog
      open
      title={experience ? `Edit ${experience.title}` : "New Experience"}
      description={experience?.standard
        ? "The three original destinations keep their designed detail sections; changes update their cards, and archiving hides the page."
        : "A valid save publishes the experience on the public website."}
      submitText={experience ? "Save Changes" : "Create Experience"}
      size="lg"
      scrollBody
      pending={save.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2">
        <TextField label="Title" required value={title} onChange={(value) => { setTitle(value); setError(undefined); }} />
        <TextField
          label="Page address"
          required
          value={slug}
          maxLength={60}
          disabled={experience?.standard}
          onChange={(value) => { setSlug(value); setError(undefined); }}
          hint={experience?.standard ? "The three original destinations keep their address." : "Lowercase words joined by hyphens, for example night-market."}
        />
        <TextField label="Category" required value={category} onChange={(value) => { setCategory(value); setError(undefined); }} hint="For example Resort, Restaurant, Community." />
        <TextField label="Status label" required value={status} onChange={(value) => { setStatus(value); setError(undefined); }} hint="Shown on the public card, for example Now open." />
        <SelectField label="Status tone" required value={statusTone} options={TONE_OPTIONS.map((item) => ({ ...item }))} onChange={(value) => setStatusTone((value || "upcoming") as ExperienceStatusTone)} />
        <TextField label="Image path" required value={imageSrc} onChange={(value) => { setImageSrc(value); setError(undefined); }} hint="A site path such as /images/site/resort/1-masterplan-new.webp." />
        <TextField label="Image description" required value={imageAlt} onChange={(value) => { setImageAlt(value); setError(undefined); }} hint="Read by screen readers." />
      </div>
      <TextAreaField label="Card summary" required maxLength={240} value={summary} onChange={(value) => { setSummary(value); setError(undefined); }} hint="One or two sentences shown on the public card." />
      {experience?.standard ? (
        <p className="tw:rounded-lg tw:border tw:border-border tw:bg-muted/40 tw:p-3 tw:text-sm tw:text-muted-foreground">
          The designed page keeps its overview and highlights; only newly added experiences edit those fields.
        </p>
      ) : (
        <>
          <TextAreaField label="Overview" required maxLength={600} value={overview} onChange={(value) => { setOverview(value); setError(undefined); }} hint="The welcome paragraph on its own page." />
          <fieldset className="tw:flex tw:flex-col tw:gap-3">
            <legend className="tw:mb-3 tw:text-sm tw:font-medium">Highlights</legend>
            {highlights.map((item, index) => (
              <div key={index} className="tw:grid tw:grid-cols-1 tw:gap-2 tw:rounded-lg tw:border tw:border-border tw:p-3 tw:sm:grid-cols-[1fr_2fr_auto] tw:sm:items-start">
                <TextField label="Highlight title" value={item.title} onChange={(value) => setHighlight(index, { title: value })} />
                <TextAreaField label="Highlight text" maxLength={400} value={item.text} onChange={(value) => setHighlight(index, { text: value })} />
                <Button
                  type="button"
                  variant="outline"
                  className="tw:min-h-11 tw:sm:min-h-8"
                  onClick={() => setHighlights((current) => current.filter((_, position) => position !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            {highlights.length < 6 ? (
              <div>
                <Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setHighlights((current) => [...current, { title: "", text: "" }])}>
                  <Plus aria-hidden="true" /> Add highlight
                </Button>
              </div>
            ) : null}
          </fieldset>
        </>
      )}
    </FormDialog>
  );
}
