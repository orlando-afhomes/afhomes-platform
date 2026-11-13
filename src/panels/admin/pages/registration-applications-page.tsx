"use client";

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
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RecordDetailsSheet, type DetailSection } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { ToneBadge, type BadgeTone } from "@/shared/components/modern/status-badge";
import { StandardDateField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { Button } from "@/shared/ui/button";
import { RegistrationCompletionDialog } from "./registration-completion-dialog";

const STATUS_TONE: Record<RegistrationStatus, BadgeTone> = {
  draft: "neutral",
  submitted: "info",
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
  withdrawn: "neutral",
  needs_info: "warning",
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
  return <ToneBadge tone={STATUS_TONE[status]}>{REGISTRATION_STATUS_LABEL[status]}</ToneBadge>;
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
        { label: "Version", value: application.version },
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
      title: "Seller details (office)",
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
      title: `Earlier version ${version.version}`,
      rows: [{ label: "Submitted", value: formatDate(version.submittedAt) }, ...applicantRows(version.applicant), { label: "Returned because", value: version.returnReason ?? "—" }],
    });
  }
  return sections;
}

/** OST application queue (doc 03 section 9.2): Clerk checks, the Administrator or Super Administrator decides. */
export function RegistrationApplicationsPage() {
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

  const actionsFor = (item: RegistrationApplication) => {
    const awaiting = isAwaitingOffice(item.status);
    return [
      ...(canReview && awaiting ? [{ key: "complete", label: item.completion ? "Update seller details" : "Check and complete", onClick: () => openAction("complete", item.id) }] : []),
      ...(canDecide && item.status === "pending_review" ? [{ key: "approve", label: "Approve", onClick: () => openAction("approve", item.id) }] : []),
      ...(canDecide && awaiting
        ? [
            { key: "return", label: "Return for correction", onClick: () => openAction("return", item.id) },
            { key: "reject", label: "Reject", onClick: () => openAction("reject", item.id) },
          ]
        : []),
    ];
  };

  const columns = useMemo<ColumnDef<RegistrationApplication, unknown>[]>(
    () => [
      { id: "reference", header: "Reference", cell: ({ row }) => <span className="tw:font-mono">{row.original.reference}</span> },
      { id: "applicant", header: "Applicant", cell: ({ row }) => <span className="tw:font-semibold">{applicantDisplayName(row.original.applicant)}</span> },
      { id: "sponsor", header: "Sponsor", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.sponsorLabel },
      { id: "submitted", header: "Submitted", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => formatDate(row.original.submittedAt) },
      { id: "version", header: "Version", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => `v${row.original.version}` },
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
      toast.success("Application approved.", { description: "The OST seller record was created and the AA number issued." });
      setAction(null);
    } catch (failure) {
      setApproveError(failure instanceof Error ? failure.message : "Could not approve this application.");
    }
  };

  return (
    <AdminPage
      anyOf={["accreditation-registrations"]}
      title="OST Applications"
      description="Applications sent through the public registration form. An application is not a seller until the Administrator approves it."
      crumbs={[{ label: "Sales Network" }, { label: "OST Applications" }]}
    >
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search applications" filters={[{ label: "Status filter", value: status, onChange: setStatus, options: STATUS_FILTER }]} />
      <DataTable<RegistrationApplication>
        caption="OST applications"
        data={rows}
        columns={columns}
        getRowId={(item) => item.id}
        emptyText="No applications found."
        loading={applications.isLoading}
        onRowOpen={(item) => setDetailId(item.id)}
        getRowLabel={(item) => `Open application ${item.reference}`}
        rowActions={(item) => <RowActionsMenu itemName={`application ${item.reference}`} onView={() => setDetailId(item.id)} extraItems={actionsFor(item)} />}
      />
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
                        title: "Private correction link",
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
        footer={
          detail ? (
            <>
              {actionsFor(detail).map((item) => (
                <Button key={item.key} type="button" variant={item.key === "reject" ? "destructive" : item.key === "approve" ? "default" : "outline"} onClick={item.onClick}>
                  {item.label}
                </Button>
              ))}
              {detail.status === "needs_info" && detail.correctionToken ? (
                <Button type="button" variant="outline" onClick={() => void copyLink(detail.correctionToken as string)}>
                  Copy correction link
                </Button>
              ) : null}
            </>
          ) : undefined
        }
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
        title="Approve this application?"
        description={`This creates the OST seller record under ${target?.sponsorLabel ?? "the sponsor"} and issues the AA number. The seller cannot sign in until an Administrator sets a temporary password.`}
        submitText="Approve and issue AA number"
        pending={review.approve.isPending}
        error={approveError}
        onClose={() => setAction(null)}
        onSubmit={() => void approve()}
      >
        <StandardDateField id="registration-approved-start" label="Accreditation start date" required value={approvedStart} onChange={setApprovedStart} hint="The accreditation is valid for one year from this date." />
      </FormDialog>
      <ReasonDialog
        open={action?.kind === "return"}
        title="Return for correction"
        description="The applicant gets a private link to fix this same application and send it again. Tell them what to fix."
        label="What the applicant should fix"
        confirmText="Return application"
        successText="Application returned. Copy the correction link from the application to send it."
        onClose={() => setAction(null)}
        onSubmit={(reason) => review.returnForCorrection.mutateAsync({ id: action?.id ?? "", reason })}
      />
      <ReasonDialog
        open={action?.kind === "reject"}
        title="Reject this application?"
        description="The application is closed. The applicant may apply again later."
        label="Reason for rejecting"
        confirmText="Reject application"
        danger
        successText="Application rejected."
        onClose={() => setAction(null)}
        onSubmit={(reason) => review.reject.mutateAsync({ id: action?.id ?? "", reason })}
      />
    </AdminPage>
  );
}
