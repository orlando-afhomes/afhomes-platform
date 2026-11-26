"use client";

import { Check, CircleCheck, Copy, Pencil, Wrench, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRegistrationApplications, useRegistrationReview } from "@/data/queries";
import type { RegistrationApplication, RegistrationStatus } from "@/modules/accreditation/types";
import {
  REGISTRATION_STATUS_LABEL,
  applicantAddress,
  applicantDisplayName,
  canDecideRegistrations,
  canReviewRegistrations,
  correctionPath,
  isAwaitingOffice,
} from "@/modules/accreditation/registration";
import { manilaToday } from "@/modules/accreditation/dates";
import { programCategoryLabel } from "@/modules/sales-network/accredited-seller";
import { useProgramCategoryLabels } from "@/data/settings-queries";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { DetailActions } from "@/shared/components/modern/detail-actions";
import { RecordDetailsSheet, type DetailSection } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu, type RowActionItem } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { StandardDateField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { RegistrationCompletionDialog } from "./registration-completion-dialog";
import type { TableOrder } from "@/shared/lib/table-order";

/** Newest application first; returned and pending applications rise ahead on the same date. */
const APPLICATION_ORDER: TableOrder<RegistrationApplication> = {
  date: (item) => item.submittedAt ?? item.createdAt,
  attention: (item) => (item.status === "needs_info" ? 3 : item.status === "submitted" || item.status === "pending_review" ? 2 : 0),
};

const ALL = "all";
const STATUS_FILTER = [
  { value: ALL, label: "All statuses" },
  ...(["submitted", "pending_review", "needs_info", "approved", "rejected"] as const).map((status) => ({ value: status, label: REGISTRATION_STATUS_LABEL[status] })),
];

const OPERATION_LABEL: Record<string, string> = {
  created: "Created",
  submitted: "Submitted by the applicant",
  resubmitted: "Corrected and resubmitted by the applicant",
  reviewed: "Checked and completed by the office",
  info_requested: "Returned to the applicant",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

type Action = { kind: "complete" | "approve" | "return" | "reject"; id: string };

function StatusTag({ status }: { status: RegistrationStatus }) {
  return <StatusBadge status={status} label={REGISTRATION_STATUS_LABEL[status]} />;
}

function maskedId(value: string): string {
  return value.length <= 4 ? "••••" : `${"•".repeat(value.length - 4)}${value.slice(-4)}`;
}

function applicantRows(item: RegistrationApplication["applicant"]) {
  return [
    { label: "Name", value: applicantDisplayName(item) },
    { label: "Mobile", value: item.mobileNumber },
    { label: "Email", value: item.email },
    { label: "Birth date", value: formatDate(item.dateOfBirth) },
    { label: "Address", value: applicantAddress(item) },
  ];
}

function detailSections(application: RegistrationApplication, programOptions: ReadonlyArray<{ value: string; label: string }>): DetailSection[] {
  const sections: DetailSection[] = [
    {
      title: "Application",
      rows: [
        { label: "Reference", value: <span className="tw:font-mono">{application.reference}</span> },
        { label: "Submission number", value: application.version },
        { label: "Submitted", value: formatDate(application.submittedAt) },
        { label: "Sponsor", value: application.sponsorLabel },
        ...(application.decisionReason ? [{ label: application.status === "rejected" ? "Rejected because" : "Returned because", value: application.decisionReason }] : []),
      ],
    },
    { title: "Applicant", rows: applicantRows(application.applicant) },
  ];
  const completion = application.completion;
  if (completion) {
    sections.push({
      title: "Seller Details (Office)",
      rows: [
        { label: "Gender", value: completion.gender },
        { label: "Civil status", value: completion.civilStatus },
        { label: "Government ID", value: `${completion.governmentIdType}, ${maskedId(completion.governmentIdNumber)}` },
        { label: "Application date", value: formatDate(completion.cardApplicationDate) },
        { label: "Program", value: programCategoryLabel(completion.programCategory, programOptions) },
        { label: "Card level", value: completion.vipCardLevel },
        { label: "Profile photo", value: completion.profilePhotoName },
      ],
    });
  }
  for (const version of application.versions.filter((item) => item.version < application.version).reverse()) {
    sections.push({
      title: `Earlier Submission ${version.version}`,
      rows: [{ label: "Submitted", value: formatDate(version.submittedAt) }, ...applicantRows(version.applicant), { label: "Returned because", value: version.returnReason ?? "—" }],
    });
  }
  return sections;
}

/** OST application queue (doc 03 section 9.2): Clerk checks, the Administrator or Super Administrator decides. */
export function RegistrationApplicationsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { identity } = useDevIdentity();
  const applications = useRegistrationApplications();
  const programOptions = useProgramCategoryLabels();
  const review = useRegistrationReview();
  const canReview = canReviewRegistrations(identity);
  const canDecide = canDecideRegistrations(identity);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [approvedStart, setApprovedStart] = useState(manilaToday());
  const [approveError, setApproveError] = useState<string | undefined>();

  const all = useMemo(() => applications.data ?? [], [applications.data]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all
      .filter((item) => status === ALL || item.status === status)
      .filter((item) => !term || [item.reference, applicantDisplayName(item.applicant), item.applicant.email, item.sponsorLabel].some((text) => text.toLowerCase().includes(term)))
      .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  }, [all, search, status]);
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  const target = action ? all.find((item) => item.id === action.id) ?? null : null;

  const openAction = (kind: Action["kind"], id: string) => {
    setDetailId(null);
    setApproveError(undefined);
    setApprovedStart(manilaToday());
    setAction({ kind, id });
  };

  // Colors follow purpose: Approve green, Return amber, Reject red; the check-and-complete step is the main action.
  const actionsFor = (item: RegistrationApplication): RowActionItem[] => {
    const awaiting = isAwaitingOffice(item.status);
    return [
      ...(canReview && awaiting ? [{ key: "complete", label: item.completion ? "Update Details" : "Add Details", icon: item.completion ? Pencil : CircleCheck, onClick: () => openAction("complete", item.id) }] : []),
      ...(canDecide && item.status === "pending_review" ? [{ key: "approve", label: "Approve", tone: "success" as const, icon: Check, onClick: () => openAction("approve", item.id) }] : []),
      ...(canDecide && awaiting
        ? [
            { key: "return", label: "Request Fix", tone: "warning" as const, icon: Wrench, onClick: () => openAction("return", item.id) },
            { key: "reject", label: "Reject", tone: "danger" as const, icon: X, onClick: () => openAction("reject", item.id) },
          ]
        : []),
    ];
  };
  const FOOTER_VARIANT = { complete: "default", approve: "success", return: "warning", reject: "destructive" } as const;

  const columns = useMemo<ColumnDef<RegistrationApplication, unknown>[]>(
    () => [
      { id: "reference", header: "Reference", cell: ({ row }) => <span className="tw:font-mono">{row.original.reference}</span> },
      { id: "applicant", header: "Applicant", cell: ({ row }) => <span className="tw:font-semibold">{applicantDisplayName(row.original.applicant)}</span> },
      { id: "sponsor", header: "Sponsor", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.sponsorLabel },
      { id: "submitted", header: "Submitted", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => formatDate(row.original.submittedAt) },
      { id: "status", header: "Status", cell: ({ row }) => <StatusTag status={row.original.status} /> },
    ],
    [],
  );

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}${correctionPath(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link.", { description: url });
    }
  };

  const approve = async () => {
    if (!action) return;
    setApproveError(undefined);
    try {
      await review.approve.mutateAsync({ id: action.id, approvedStart });
      toast.success("Application approved.", { description: "The Outsourced Seller record was created and the accreditation number issued." });
      setAction(null);
    } catch (failure) {
      setApproveError(failure instanceof Error ? failure.message : "Could not approve this application.");
    }
  };

  return (
    <AdminPage
      embedded={embedded}
      anyOf={["accreditation-registrations"]}
      title="Seller Applications"
      crumbs={[{ label: "Sales Network" }, { label: "Seller Applications" }]}
    >
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search applications" filters={[{ label: "Status filter", value: status, onChange: setStatus, options: STATUS_FILTER }]} />
      <QueryState isLoading={applications.isLoading} error={applications.error} onRetry={() => void applications.refetch()}>
        <DataTable<RegistrationApplication>
          caption="Seller Applications"
          orderBy={APPLICATION_ORDER}
          data={rows}
          columns={columns}
          getRowId={(item) => item.id}
          emptyText="No applications found."
          onRowOpen={(item) => setDetailId(item.id)}
          getRowLabel={(item) => `Open application ${item.reference}`}
          rowActions={(item) => <RowActionsMenu itemName={`application ${item.reference}`} extraItems={actionsFor(item)} />}
        />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? applicantDisplayName(detail.applicant) : "Application"}
        subtitle={detail?.reference}
        badge={detail ? <StatusTag status={detail.status} /> : undefined}
        sections={
          detail
            ? [
                ...detailSections(detail, programOptions),
                ...(detail.status === "needs_info" && detail.correctionToken
                  ? [
                      {
                        title: "Private Correction Link",
                        rows: [
                          { label: "Link", value: <span className="tw:font-mono tw:text-xs">{correctionPath(detail.correctionToken)}</span> },
                          { label: "Delivery", value: "Email and text delivery is not available yet. Copy the link and send it to the applicant yourself." },
                        ],
                      },
                    ]
                  : []),
              ]
            : []
        }
        history={detail?.history.map((entry, index) => ({
          key: `${entry.changedAt}-${index}`,
          when: formatDate(entry.changedAt),
          text: `${OPERATION_LABEL[entry.operation] ?? entry.operation}${entry.note ? `: ${entry.note}` : ""}`,
        }))}
        footer={detail ? <DetailActions actions={[
          ...actionsFor(detail).map((item) => ({
            ...item, next: item.key === "approve" || item.key === "complete",
            variant: item.key === "reject" ? "destructive" as const : FOOTER_VARIANT[item.key as keyof typeof FOOTER_VARIANT],
          })),
          detail.status === "needs_info" && detail.correctionToken ? {
            key: "copy", label: "Copy Link", next: true, variant: "violet", icon: Copy,
            onClick: () => void copyLink(detail.correctionToken as string),
          } : null,
        ]} /> : undefined}
      />
      {action?.kind === "complete" ? (
        <RegistrationCompletionDialog
          key={action.id}
          initial={target?.completion ?? null}
          onClose={() => setAction(null)}
          onSubmit={async (completion) => {
            await review.complete.mutateAsync({ id: action.id, completion });
            toast.success("Application checked. It is ready for the Administrator's decision.");
          }}
        />
      ) : null}
      <FormDialog
        open={action?.kind === "approve"}
        title="Approve This Application?"
        description={`This creates the Outsourced Seller record under ${target?.sponsorLabel ?? "the sponsor"} and issues the accreditation number. The seller cannot sign in until an Administrator sets a temporary password.`}
        submitText="Approve and Issue Accreditation Number"
        submitVariant="success"
        pending={review.approve.isPending}
        error={approveError}
        onClose={() => setAction(null)}
        onSubmit={() => void approve()}
      >
        <StandardDateField id="registration-approved-start" label="Accreditation start date" required value={approvedStart} onChange={setApprovedStart} hint="The accreditation is valid for one year from this date." />
      </FormDialog>
      <ReasonDialog
        open={action?.kind === "return"}
        title="Request Fix"
        description="The applicant gets a private link to fix this same application and send it again. Tell them what to fix."
        label="What the Applicant Should Fix"
        confirmText="Return Application" tone="warning"
        successText="Application returned. Copy the correction link from the application to send it."
        onClose={() => setAction(null)}
        onSubmit={(reason) => review.returnForCorrection.mutateAsync({ id: action?.id ?? "", reason })}
      />
      <ReasonDialog
        open={action?.kind === "reject"}
        title="Reject This Application?"
        description="The application is closed. The applicant may apply again later."
        label="Reason for Rejecting"
        confirmText="Reject Application"
        danger
        successText="Application rejected."
        onClose={() => setAction(null)}
        onSubmit={(reason) => review.reject.mutateAsync({ id: action?.id ?? "", reason })}
      />
    </AdminPage>
  );
}
