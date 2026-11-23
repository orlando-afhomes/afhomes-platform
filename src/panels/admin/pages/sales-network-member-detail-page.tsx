"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useId, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, BadgeCheck, Briefcase, CalendarDays, FileText, History, Home, Layers, MapPin, Network, Pencil, Phone, RefreshCw, User, UserCheck, UserX, Users, type LucideIcon } from "lucide-react";
import type { OrgMember } from "@/modules/organization/types";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useSalesNetworkMemberByKey, useMemberAccreditations, useSeatVacancies, useChangeSalesNetworkMemberStatus, useIssuePendingAccreditation } from "@/data/queries";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { getDescendantIds } from "@/data/mock/scope";
import { buildAuthorizedGenealogyTree } from "@/modules/sales-network/genealogy";
import { resolveEffectiveAccreditationEligibility, getCurrentAccreditationRecord, hasAmbiguousAccreditation } from "@/modules/accreditation/eligibility";
import { ACCREDITATION_REMINDER_LABELS, getAccreditationReminder, manilaToday } from "@/modules/accreditation/dates";
import { findOpenVacancy, openVacancyStartByMember } from "@/modules/sales-network/vacancy";
import { aaDisplay, designationLabel, resolveAccreditationDisplay, teamDisplayName } from "@/modules/sales-network/display";
import { programCategoryLabel } from "@/modules/sales-network/accredited-seller";
import { useProgramCategoryLabels } from "@/data/settings-queries";
import { maskGovIdNumber } from "@/shared/forms";
import { formatDate } from "@/shared/lib/format-date";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { InfoGrid, InfoItem } from "@/shared/components/modern/info-grid";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button, buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/card";
import { AdminPage, AdminSection, AdminSectionHeading, DetailHero } from "@/shared/components/admin";
import { AdminTabs, type AdminTabItem } from "@/shared/components/admin/admin-tabs";
import { DetailSkeleton } from "@/shared/components/modern/skeletons";
import { ErrorState } from "@/shared/components/modern/error-state";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { buildMemberMenuProps, resolveRenewTarget } from "../actions/sales-network-actions";
import { SalesNetworkMemberDialogs } from "./sales-network-member-dialogs";
import { toast } from "sonner";
import { AccreditationEligibilityTag } from "../components/accreditation-status";
import { AccreditationRenewAction } from "../components/accreditation-renew-action";
import { DesignationBadge, toneFromColor } from "@/shared/components/business/designation-badge";
import { GenealogyTree } from "./sales-network-genealogy-page";
import { humanize } from "@/shared/lib/humanize";
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";

function collectKeys(nodes: ReturnType<typeof buildAuthorizedGenealogyTree>): string[] {
  const keys: string[] = [];
  const visit = (items: typeof nodes) => {
    for (const item of items) {
      keys.push(item.key);
      visit(item.children);
    }
  };
  visit(nodes);
  return keys;
}

export function SalesNetworkMemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const granted = resolveEffectiveModules(store, identity);
  const memberQuery = useSalesNetworkMemberByKey(id);
  const membersQuery = useMembers();
  const accreditationsQuery = useMemberAccreditations(memberQuery.data?.id ?? "");
  const vacanciesQuery = useSeatVacancies();
  const programCategoryLabels = useProgramCategoryLabels();

  const member = memberQuery.data ?? null;
  const members = useMemo<OrgMember[]>(() => membersQuery.data ?? [], [membersQuery.data]);
  const accreditations = accreditationsQuery.data ?? [];
  const currentAccreditation = getCurrentAccreditationRecord(accreditations);
  const ambiguousAccreditation = hasAmbiguousAccreditation(accreditations);
  const eligibility = member ? resolveEffectiveAccreditationEligibility(member, accreditations, manilaToday()) : null;
  const reminder = getAccreditationReminder(currentAccreditation?.expiryDate ?? null, manilaToday());
  const vacantSince = useMemo(() => openVacancyStartByMember(vacanciesQuery.data ?? []), [vacanciesQuery.data]);
  const openVacancy = member ? findOpenVacancy(vacanciesQuery.data ?? [], member.id) : null;
  const canRenew = identity.status === "active" && identity.roles.some((role) => role === "super_admin" || role === "admin");
  const canManage = hasOperationPermission(identity, "sales-network.manage");
  const canTransfer = hasOperationPermission(identity, "sales-network.transfer");
  const canChangeStatus = hasOperationPermission(identity, "sales-network.status");
  const canEditAccreditation = identity.status === "active" && identity.roles.includes("super_admin");
  const isAdmin = identity.roles.some((role) => role === "super_admin" || role === "admin");
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const { mutateAsync: changeStatus } = useChangeSalesNetworkMemberStatus();
  const issuePending = useIssuePendingAccreditation();
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [accreditOpen, setAccreditOpen] = useState(false);
  const directDownline = member ? members.filter((item) => item.parentId === member.id) : [];
  const parent = member?.parentId ? members.find((item) => item.id === member.parentId) : undefined;
  const downlineTree = useMemo(() => {
    if (!member) return [];
    const descendantIds = getDescendantIds(member.id, members);
    const subset = members.filter((item) => item.id === member.id || descendantIds.has(item.id));
    const ids = new Set(subset.map((item) => item.id));
    return buildAuthorizedGenealogyTree(subset, ids).map((root) => ({ ...root, restrictedParent: false }));
  }, [member, members]);
  // The downline is fully expanded by default; the user can collapse branches.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("overview");
  const tabPrefix = useId();
  const historyDetail = historyKey ? (member?.parentHistory ?? []).find((item) => `${item.changedAt}-${item.operation}-${item.actorId}` === historyKey) ?? null : null;
  const expandedKeys = useMemo(() => collectKeys(downlineTree).filter((key) => !collapsed.includes(key)), [downlineTree, collapsed]);
  const memberNameById = useMemo(() => new Map(members.map((item) => [item.id, item.displayName])), [members]);
  const parentLabel = (id: string | null | undefined) => (id ? (memberNameById.get(id) ?? EMPTY) : EMPTY);
  const actorLabel = (id: string) => DEV_IDENTITIES.find((identity) => identity.id === id)?.displayName ?? memberNameById.get(id) ?? "System";
  const historyColumns = useMemo<ColumnDef<NonNullable<OrgMember["parentHistory"]>[number], unknown>[]>(
    () => [
      { id: "operation", header: "Operation", cell: ({ row }) => humanize(row.original.operation) },
      { id: "previousParent", header: "Previous Parent", cell: ({ row }) => parentLabel(row.original.previousParentId) },
      { id: "newParent", header: "New Parent", cell: ({ row }) => parentLabel(row.original.newParentId) },
      { id: "actor", header: "Actor", cell: ({ row }) => actorLabel(row.original.actorId) },
      { id: "timestamp", header: "Timestamp", cell: ({ row }) => row.original.changedAt },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memberNameById],
  );

  if (!granted.has("sales-network")) {
    return (
      <PageContainer>
        <PageHeader title="Access Restricted" description="This account does not have access to Sales Network." />
      </PageContainer>
    );
  }

  if (memberQuery.isLoading) {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    );
  }

  // A failed load is never a "not found": the error branch comes first with a retry.
  if (memberQuery.error && !member) {
    return (
      <PageContainer>
        <ErrorState
          text={memberQuery.error instanceof Error ? memberQuery.error.message : undefined}
          onRetry={() => void memberQuery.refetch()}
        />
        <div className="tw:mt-3 tw:flex tw:justify-center">
          <Link href="/admin/sales-network/members" className={cn(buttonVariants({ variant: "outline" }), "tw:min-h-11 tw:sm:min-h-8")}>
            Back to Members
          </Link>
        </div>
      </PageContainer>
    );
  }

  // Accreditation records drive the badges and validity on this page; a
  // first-load failure leaves nothing to render, so it blocks like the
  // shared contract frame's data error. A failed background refetch keeps
  // its data and is allowed to stay on screen.
  if (accreditationsQuery.error && accreditationsQuery.data === undefined) {
    return (
      <PageContainer>
        <ErrorState
          title="Accreditation data could not be loaded"
          text="The accreditation records could not be loaded, so the status and validity on this page would be incomplete. Try again before acting on this member."
          onRetry={() => void accreditationsQuery.refetch()}
        />
        <div className="tw:mt-3 tw:flex tw:justify-center">
          <Link href="/admin/sales-network/members" className={cn(buttonVariants({ variant: "outline" }), "tw:min-h-11 tw:sm:min-h-8")}>
            Back to Members
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer>
        <Card className="tw:p-8 tw:text-center tw:text-muted-foreground">Member not found or restricted.</Card>
        <div className="tw:mt-3 tw:flex tw:justify-center">
          <Link href="/admin/sales-network/members" className={cn(buttonVariants({ variant: "outline" }), "tw:min-h-11 tw:sm:min-h-8")}>
            Back to Members
          </Link>
        </div>
      </PageContainer>
    );
  }

  const classification = designationLabel(member.designation === "OST" ? "OST" : "IST");
  const profile = member.sellerProfile;
  const display = resolveAccreditationDisplay(accreditations);
  const downlineTotal = Math.max(0, collectKeys(downlineTree).length - 1);
  const hasHistory = (member.parentHistory?.length ?? 0) > 0;
  const parentDisplay = parent ? `${parent.displayName} (${designationLabel(parent.designation)})` : "—";

  const toggleStatus = () => {
    const reactivate = member.status !== "active";
    confirmRun({
      title: reactivate ? `Reactivate ${member.displayName}?` : `Deactivate ${member.displayName}?`,
      description: reactivate ? "The member will regain active access." : "The member will lose active access and move to Inactive.",
      confirmText: reactivate ? "Reactivate" : "Deactivate",
      danger: !reactivate, tone: reactivate ? "success" : "destructive",
      action: () => changeStatus({ id: member.id, status: reactivate ? "active" : "inactive" }),
      successTitle: reactivate ? "Member reactivated." : "Member deactivated.",
      successDescription: `${member.displayName} is now ${reactivate ? "Active" : "Inactive"}.`,
      errorTitle: "Status update failed.",
    });
  };
  const menu = buildMemberMenuProps(
    member,
    {
      canManage,
      canTransfer,
      canChangeStatus,
      canReactivate: isAdmin,
      canEditAccreditation,
      canRenew,
      accreditationNone: display.kind === "none",
      renewalAllowed: resolveRenewTarget(accreditations).open,
    },
    {
      onEdit: () => setEditOpen(true),
      onTransfer: () => setTransferOpen(true),
      onChangeStatus: toggleStatus,
      onSetAccreditation: () => setAccreditOpen(true),
    },
  );

  // The menu's actions become header buttons, colored by purpose: the main action
  // first, then success, warning, and destructive last.
  const HEADER_BUTTON: Record<string, { variant: "success" | "warning" | "destructive" | "info"; rank: number }> = {
    reactivate: { variant: "success", rank: 0 },
    "set-accreditation": { variant: "success", rank: 0 },
    transfer: { variant: "warning", rank: 1 },
    deactivate: { variant: "destructive", rank: 3 },
  };
  const HEADER_ICON: Record<string, LucideIcon> = {
    reactivate: UserCheck,
    deactivate: UserX,
    transfer: ArrowRightLeft,
    "set-accreditation": BadgeCheck,
    "renew-accreditation": RefreshCw,
  };
  const headerButtons = menu.extraItems
    .map((item) => ({ ...item, ...(HEADER_BUTTON[item.key] ?? { variant: "info" as const, rank: 2 }) }))
    .sort((a, b) => a.rank - b.rank);

  const accreditationBadge =
    display.kind === "none" ? (
      <StatusBadge status={EMPTY} />
    ) : display.kind === "ambiguous" ? (
      <StatusBadge status="Review records" tone="warning" />
    ) : display.kind === "static" ? (
      <StatusBadge status={display.label} tone={display.color ? toneFromColor(display.color) : undefined} />
    ) : (
      <StatusBadge status={display.value === "active" ? "Accredited" : "Pending"} />
    );
  const validityNode = eligibility ? <AccreditationEligibilityTag eligible={eligibility.eligible} expired={eligibility.eligible && eligibility.expired === true} /> : "—";
  const aaNumberHistory = currentAccreditation?.aaNumberHistory ?? [];

  const tabItems: AdminTabItem[] = [
    { value: "overview", label: "Overview", Icon: Home },
    ...(profile ? [{ value: "profile", label: "Profile", Icon: User }] : []),
    { value: "downline", label: "Team Below", Icon: Users, count: downlineTotal },
    ...(hasHistory ? [{ value: "history", label: "History", Icon: History }] : []),
  ];
  const activeTab = tabItems.some((item) => item.value === tab) ? tab : "overview";

  return (
    <AdminPage
      anyOf={["sales-network"]}
      title={member.displayName}
      crumbs={[
        { label: "Sales Network" },
        { label: "Members", href: "/admin/sales-network/members" },
        { label: member.displayName },
      ]}
      actions={
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <Link href="/admin/sales-network/members" className={cn(buttonVariants({ variant: "outline" }), "tw:min-h-11 tw:sm:min-h-8")}>
            <ArrowLeft aria-hidden="true" /> Back
          </Link>
          {menu.onEdit ? (
            <Button type="button" onClick={menu.onEdit}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
          ) : null}
          {headerButtons.map((item) => {
            const Icon = HEADER_ICON[item.key] ?? BadgeCheck;
            return (
              <Button key={item.key} type="button" variant={item.variant} onClick={item.onClick}>
                <Icon aria-hidden="true" /> {item.label}
              </Button>
            );
          })}
        </div>
      }
    >
      <div className="tw:flex tw:flex-col tw:gap-6">
        <DetailHero
          ariaLabel={`Member summary for ${member.displayName}`}
          avatar={
            <Avatar className="tw:size-16 tw:text-base">
              {profile?.profilePhotoUrl ? <AvatarImage src={profile.profilePhotoUrl} alt={`Profile photo of ${member.displayName}`} /> : null}
              <AvatarFallback aria-label={`No profile photo for ${member.displayName}`}>
                {profile ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() : member.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          }
          name={member.displayName}
          badges={
            <>
              <DesignationBadge designation={member.designation} full />
              <StatusBadge status={member.status} />
              {accreditationBadge}
              {openVacancy ? <StatusBadge status={`Seat vacant since ${formatDate(openVacancy.startDate)}`} tone="warning" /> : null}
            </>
          }
          subtitle={aaDisplay(member)}
          meta={[
            { label: "Team", value: teamDisplayName(member, members), Icon: Layers },
            { label: "Parent", value: parentDisplay, Icon: Network },
            { label: "Team Below", value: `${directDownline.length} direct · ${downlineTotal} whole team`, Icon: Users },
            { label: "Validity", value: validityNode, Icon: BadgeCheck },
            { label: "Approved Expiry", value: formatDate(currentAccreditation?.expiryDate), Icon: CalendarDays },
          ]}
        />

        <AdminTabs items={tabItems} value={activeTab} onChange={setTab} label="Member detail views" idPrefix={tabPrefix} />

        {activeTab === "overview" ? (
          <div role="tabpanel" id={`${tabPrefix}-panel-overview`} aria-labelledby={`${tabPrefix}-tab-overview`} className="tw:grid tw:grid-cols-1 tw:gap-5 tw:lg:grid-cols-2">
            <AdminSection title="Membership" icon={User}>
              <InfoGrid label="Membership details" columns={2}>
                <InfoItem term="Accreditation Number">{aaDisplay(member)}</InfoItem>
                <InfoItem term="Position">
                  <DesignationBadge designation={member.designation} full />
                </InfoItem>
                <InfoItem term="Member Status">
                  <StatusBadge status={member.status} />
                </InfoItem>
                <InfoItem term="Team">{teamDisplayName(member, members)}</InfoItem>
                {openVacancy ? <InfoItem term="Seat">Vacant since {formatDate(openVacancy.startDate)}</InfoItem> : null}
                <InfoItem term="Parent" wide>
                  {parentDisplay}
                </InfoItem>
              </InfoGrid>
            </AdminSection>
            <AdminSection title="Accreditation" icon={BadgeCheck}>
              <InfoGrid label="Accreditation details" columns={2}>
                <InfoItem term="Accreditation Number">{currentAccreditation?.aaNumber ?? member.aaNumber ?? "Pending Accreditation Number"}</InfoItem>
                <InfoItem term="Seller Type">{currentAccreditation?.classification ?? classification}</InfoItem>
                <InfoItem term="Accreditation Status">{accreditationBadge}</InfoItem>
                <InfoItem term="Validity">{validityNode}</InfoItem>
                <InfoItem term="Original Accreditation Date">{formatDate(currentAccreditation?.originalAccreditationDate)}</InfoItem>
                <InfoItem term="Approved Start">{formatDate(currentAccreditation?.effectiveDate)}</InfoItem>
                <InfoItem term="Approved Expiry">{formatDate(currentAccreditation?.expiryDate)}</InfoItem>
                {reminder ? <InfoItem term="Renewal Reminder">{ACCREDITATION_REMINDER_LABELS[reminder]}</InfoItem> : null}
              </InfoGrid>
              <AccreditationRenewAction record={currentAccreditation} memberName={member.displayName} canRenew={canRenew} />
              {ambiguousAccreditation ? (
                <p role="note" className="tw:mt-4 tw:text-sm tw:text-muted-foreground">
                  Multiple accreditation records share the latest date; status cannot be resolved automatically.
                </p>
              ) : null}
            </AdminSection>
            {aaNumberHistory.length > 0 ? (
              <AdminSection title="Accreditation Number History" icon={History} className="tw:lg:col-span-2">
                <ul aria-label="Accreditation Number History" className="tw:flex tw:flex-col tw:gap-1 tw:text-sm">
                  {aaNumberHistory.map((entry) => (
                    <li key={entry.aaNumber}>
                      <span className="tw:font-medium">{entry.aaNumber}</span> replaced by {entry.replacedBy} on {formatDate(entry.replacedOn)}
                    </li>
                  ))}
                </ul>
              </AdminSection>
            ) : null}
          </div>
        ) : null}

        {activeTab === "profile" && profile ? (
          <div role="tabpanel" id={`${tabPrefix}-panel-profile`} aria-labelledby={`${tabPrefix}-tab-profile`} className="tw:grid tw:grid-cols-1 tw:gap-5 tw:lg:grid-cols-2">
            <AdminSection title="Personal" icon={User}>
              <InfoGrid label="Personal details" columns={2}>
                <InfoItem term="First Name">{profile.firstName}</InfoItem>
                <InfoItem term="Middle Name">{profile.middleName ?? "—"}</InfoItem>
                <InfoItem term="Last Name">{profile.lastName}</InfoItem>
                {profile.suffix ? <InfoItem term="Suffix">{profile.suffix}</InfoItem> : null}
                <InfoItem term="Date of Birth">{formatDate(profile.dateOfBirth)}</InfoItem>
                <InfoItem term="Gender">{profile.gender}</InfoItem>
                <InfoItem term="Civil Status">{profile.civilStatus}</InfoItem>
              </InfoGrid>
            </AdminSection>
            <AdminSection title="Contact" icon={Phone}>
              <InfoGrid label="Contact details" columns={2}>
                <InfoItem term="Mobile Number">{profile.mobileNumber}</InfoItem>
                {profile.telephone ? <InfoItem term="Telephone / Landline">{profile.telephone}</InfoItem> : null}
                <InfoItem term="Email" wide>
                  {profile.email}
                </InfoItem>
                {profile.facebook ? (
                  <InfoItem term="Facebook / Messenger" wide>
                    {profile.facebook}
                  </InfoItem>
                ) : null}
              </InfoGrid>
            </AdminSection>
            <AdminSection title="Address" icon={MapPin} className="tw:lg:col-span-2">
              <InfoGrid label="Address" columns={2}>
                <InfoItem term="Number / Street" wide>
                  {profile.address.street}
                </InfoItem>
                <InfoItem term="Barangay">{profile.address.barangay}</InfoItem>
                <InfoItem term="City / Municipality">{profile.address.city}</InfoItem>
                <InfoItem term="Province">{profile.address.province}</InfoItem>
                <InfoItem term="ZIP / Postal Code">{profile.address.postalCode}</InfoItem>
              </InfoGrid>
            </AdminSection>
            <AdminSection title="Government ID and Card" icon={FileText}>
              <InfoGrid label="Government ID and card details" columns={2}>
                <InfoItem term="Government ID">{profile.governmentIdType}</InfoItem>
                <InfoItem term="Government ID Number">{maskGovIdNumber(profile.governmentIdNumber)}</InfoItem>
                {profile.tin ? <InfoItem term="TIN">{profile.tin}</InfoItem> : null}
                <InfoItem term="Date of Card Application">{formatDate(profile.cardApplicationDate)}</InfoItem>
                <InfoItem term="Program Category">{programCategoryLabel(profile.programCategory, programCategoryLabels)}</InfoItem>
                <InfoItem term="VIP Card Level">{store.products.find((product) => product.code === profile.vipCardLevel)?.name ?? profile.vipCardLevel}</InfoItem>
                <InfoItem term="Seller Source">Manual admin creation</InfoItem>
              </InfoGrid>
            </AdminSection>
            {profile.businessEmployer || profile.businessAddress || profile.jobPosition ? (
              <AdminSection title="Employment" icon={Briefcase} className="tw:lg:col-span-2">
                <InfoGrid label="Employment details" columns={2}>
                  {profile.businessEmployer ? <InfoItem term="Business / Employer">{profile.businessEmployer}</InfoItem> : null}
                  {profile.jobPosition ? <InfoItem term="Job Position">{profile.jobPosition}</InfoItem> : null}
                  {profile.businessAddress ? (
                    <InfoItem term="Business / Employer Address" wide>
                      {profile.businessAddress}
                    </InfoItem>
                  ) : null}
                </InfoGrid>
              </AdminSection>
            ) : null}
          </div>
        ) : null}

        {activeTab === "downline" ? (
          <div role="tabpanel" id={`${tabPrefix}-panel-downline`} aria-labelledby={`${tabPrefix}-tab-downline`}>
            <section aria-label="Team below" className="tw:flex tw:flex-col tw:gap-3">
              <AdminSectionHeading title="Team Below" icon={Network} />
              {directDownline.length === 0 ? (
                <p className="tw:p-4 tw:text-center tw:text-muted-foreground">No direct team members.</p>
              ) : (
                <div className="tw:overflow-x-auto">
                  <GenealogyTree
                    nodes={downlineTree}
                    members={members}
                    selectedKey={null}
                    onSelect={() => {}}
                    vacantSince={vacantSince}
                    expandedKeys={expandedKeys}
                    onToggle={(key) => setCollapsed((previous) => (previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]))}
                    detailed
                  />
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "history" && hasHistory ? (
          <div role="tabpanel" id={`${tabPrefix}-panel-history`} aria-labelledby={`${tabPrefix}-tab-history`}>
            <section aria-label="Relationship history" className="tw:flex tw:flex-col tw:gap-3">
              <AdminSectionHeading title="Relationship History" icon={History} />
              <DataTable
                data={member.parentHistory ?? []}
                columns={historyColumns}
                getRowId={(row) => `${row.changedAt}-${row.operation}-${row.actorId}`}
                emptyText="No relationship history."
                caption="Relationship History"
                onRowOpen={(row) => setHistoryKey(`${row.changedAt}-${row.operation}-${row.actorId}`)}
                getRowLabel={(row) => `Open ${humanize(row.operation)} change`}
              />
              <RecordDetailsSheet
                open={historyDetail !== null}
                onClose={() => setHistoryKey(null)}
                title={historyDetail ? humanize(historyDetail.operation) : "Relationship Change"}
                subtitle={historyDetail?.changedAt}
                sections={
                  historyDetail
                    ? [
                        {
                          title: "Change",
                          rows: [
                            { label: "Previous parent", value: parentLabel(historyDetail.previousParentId) },
                            { label: "New parent", value: parentLabel(historyDetail.newParentId) },
                            { label: "Actor", value: actorLabel(historyDetail.actorId) },
                          ],
                        },
                      ]
                    : []
                }
              />
            </section>
          </div>
        ) : null}
      </div>
      <SalesNetworkMemberDialogs
        editMember={editOpen ? member : null}
        transferMember={transferOpen ? member : null}
        onCloseEdit={() => setEditOpen(false)}
        onCloseTransfer={() => setTransferOpen(false)}
      />
      <ConfirmDialog
        open={accreditOpen}
        title="Create Pending Accreditation"
        description={`Create a pending accreditation with automatic accreditation number issuance for seller ${member.displayName}?`}
        confirmText="Create"
        pending={issuePending.isPending}
        onConfirm={() => {
          void issuePending.mutateAsync(member.id).then(
            (created) => {
              setAccreditOpen(false);
              toast.success("Pending accreditation created.", {
                description: `Issued ${created.aaNumber ?? "accreditation number"}. Accreditation stays Pending until approval.`,
              });
            },
            (err: unknown) => {
              setAccreditOpen(false);
              toast.error("Creation failed.", { description: err instanceof Error ? err.message : "Failed to create accreditation." });
            },
          );
        }}
        onClose={() => setAccreditOpen(false)}
      />
      {confirmDialog}
    </AdminPage>
  );
}
