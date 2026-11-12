"use client";

import { useId, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Briefcase, CalendarDays, FileText, History, Home, Layers, MapPin, Network, Phone, User, Users } from "lucide-react";
import type { OrgMember } from "@/modules/organization/types";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers, useSalesNetworkMemberByKey, useMemberAccreditations } from "@/data/queries";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { getDescendantIds } from "@/data/mock/scope";
import { buildAuthorizedGenealogyTree } from "@/modules/sales-network/genealogy";
import { resolveEffectiveAccreditationEligibility, getCurrentAccreditationRecord, hasAmbiguousAccreditation } from "@/modules/accreditation/eligibility";
import { manilaToday } from "@/modules/accreditation/dates";
import { aaDisplay, designationLabel, resolveAccreditationDisplay, teamDisplayName } from "@/modules/sales-network/display";
import { programCategoryLabel } from "@/modules/sales-network/accredited-seller";
import { maskGovIdNumber } from "@/shared/forms";
import { formatDate } from "@/shared/lib/format-date";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { InfoGrid, InfoItem } from "@/shared/components/modern/info-grid";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/card";
import { AdminPage, AdminSection, AdminSectionHeading, DetailHero } from "@/shared/components/admin";
import { AdminTabs, type AdminTabItem } from "@/shared/components/admin/admin-tabs";
import { DetailSkeleton } from "@/shared/components/modern/skeletons";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { AccreditationEligibilityTag } from "../components/accreditation-status";
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

  const member = memberQuery.data ?? null;
  const members = useMemo<OrgMember[]>(() => membersQuery.data ?? [], [membersQuery.data]);
  const accreditations = accreditationsQuery.data ?? [];
  const currentAccreditation = getCurrentAccreditationRecord(accreditations);
  const ambiguousAccreditation = hasAmbiguousAccreditation(accreditations);
  const eligibility = member ? resolveEffectiveAccreditationEligibility(member, accreditations, manilaToday()) : null;
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
  const parentLabel = (id: string | null | undefined) => (id ? (memberNameById.get(id) ?? "Unknown member") : "—");
  const actorLabel = (id: string) => DEV_IDENTITIES.find((identity) => identity.id === id)?.displayName ?? memberNameById.get(id) ?? "System";
  const historyColumns = useMemo<ColumnDef<NonNullable<OrgMember["parentHistory"]>[number], unknown>[]>(
    () => [
      { id: "operation", header: "Operation", cell: ({ row }) => humanize(row.original.operation) },
      { id: "previousParent", header: "Previous parent", cell: ({ row }) => parentLabel(row.original.previousParentId) },
      { id: "newParent", header: "New parent", cell: ({ row }) => parentLabel(row.original.newParentId) },
      { id: "actor", header: "Actor", cell: ({ row }) => actorLabel(row.original.actorId) },
      { id: "timestamp", header: "Timestamp", cell: ({ row }) => row.original.changedAt },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memberNameById],
  );

  if (!granted.has("sales-network")) {
    return (
      <PageContainer>
        <PageHeader title="Access restricted" description="This account does not have access to Sales Network." />
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

  if (!member) {
    return (
      <PageContainer>
        <Card className="tw:p-8 tw:text-center tw:text-muted-foreground">Member not found or restricted.</Card>
        <div className="tw:mt-3 tw:flex tw:justify-center">
          <Link href="/admin/sales-network/members" className={cn(buttonVariants({ variant: "outline" }), "tw:min-h-11 tw:sm:min-h-8")}>
            Back to members
          </Link>
        </div>
      </PageContainer>
    );
  }

  const classification = member.designation === "OST" ? "OST" : "IST";
  const profile = member.sellerProfile;
  const display = resolveAccreditationDisplay(accreditations);
  const downlineTotal = Math.max(0, collectKeys(downlineTree).length - 1);
  const hasHistory = (member.parentHistory?.length ?? 0) > 0;
  const parentDisplay = parent ? `${parent.displayName} (${designationLabel(parent.designation)})` : "—";

  const accreditationBadge =
    display.kind === "none" ? (
      <StatusBadge status="No record" />
    ) : display.kind === "ambiguous" ? (
      <StatusBadge status="Review records" tone="warning" />
    ) : display.kind === "static" ? (
      <StatusBadge status={display.label} tone={display.color ? toneFromColor(display.color) : undefined} />
    ) : (
      <StatusBadge status={display.value === "active" ? "Accredited" : "Pending"} />
    );
  const validityNode = eligibility ? <AccreditationEligibilityTag eligible={eligibility.eligible} /> : "—";

  const tabItems: AdminTabItem[] = [
    { value: "overview", label: "Overview", Icon: Home },
    ...(profile ? [{ value: "profile", label: "Profile", Icon: User }] : []),
    { value: "downline", label: "Downline", Icon: Users, count: downlineTotal },
    ...(hasHistory ? [{ value: "history", label: "History", Icon: History }] : []),
  ];
  const activeTab = tabItems.some((item) => item.value === tab) ? tab : "overview";

  return (
    <AdminPage
      anyOf={["sales-network"]}
      title={member.displayName}
      description={`${designationLabel(member.designation)} · ${classification} · ${teamDisplayName(member, members)}`}
      crumbs={[
        { label: "Sales Network" },
        { label: "Members", href: "/admin/sales-network/members" },
        { label: member.displayName },
      ]}
      actions={
        <Link href="/admin/sales-network/members" className={cn(buttonVariants({ variant: "outline" }), "tw:min-h-11 tw:sm:min-h-8")}>
          Back
        </Link>
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
            </>
          }
          subtitle={aaDisplay(member)}
          meta={[
            { label: "Team", value: teamDisplayName(member, members), Icon: Layers },
            { label: "Parent", value: parentDisplay, Icon: Network },
            { label: "Downline", value: `${directDownline.length} direct · ${downlineTotal} total`, Icon: Users },
            { label: "Validity", value: validityNode, Icon: BadgeCheck },
            { label: "Approved expiry", value: formatDate(currentAccreditation?.expiryDate), Icon: CalendarDays },
          ]}
        />

        <AdminTabs items={tabItems} value={activeTab} onChange={setTab} label="Member detail views" idPrefix={tabPrefix} />

        {activeTab === "overview" ? (
          <div role="tabpanel" id={`${tabPrefix}-panel-overview`} aria-labelledby={`${tabPrefix}-tab-overview`} className="tw:grid tw:gap-5 tw:lg:grid-cols-2">
            <AdminSection title="Membership" icon={User}>
              <InfoGrid label="Membership details" columns={2}>
                <InfoItem term="AA Number">{aaDisplay(member)}</InfoItem>
                <InfoItem term="Position">
                  <DesignationBadge designation={member.designation} full />
                </InfoItem>
                <InfoItem term="Member Status">
                  <StatusBadge status={member.status} />
                </InfoItem>
                <InfoItem term="Team">{teamDisplayName(member, members)}</InfoItem>
                <InfoItem term="Parent" wide>
                  {parentDisplay}
                </InfoItem>
              </InfoGrid>
            </AdminSection>
            <AdminSection title="Accreditation" icon={BadgeCheck}>
              <InfoGrid label="Accreditation details" columns={2}>
                <InfoItem term="AA Number">{currentAccreditation?.aaNumber ?? member.aaNumber ?? "Pending AA Issuance"}</InfoItem>
                <InfoItem term="Classification">{currentAccreditation?.classification ?? classification}</InfoItem>
                <InfoItem term="Accreditation Status">{accreditationBadge}</InfoItem>
                <InfoItem term="Validity">{validityNode}</InfoItem>
                <InfoItem term="Original Accreditation Date">{formatDate(currentAccreditation?.originalAccreditationDate)}</InfoItem>
                <InfoItem term="Approved Start">{formatDate(currentAccreditation?.effectiveDate)}</InfoItem>
                <InfoItem term="Approved Expiry">{formatDate(currentAccreditation?.expiryDate)}</InfoItem>
              </InfoGrid>
              {ambiguousAccreditation ? (
                <p role="note" className="tw:mt-4 tw:text-sm tw:text-muted-foreground">
                  Multiple accreditation records share the latest date; status cannot be resolved automatically.
                </p>
              ) : null}
            </AdminSection>
          </div>
        ) : null}

        {activeTab === "profile" && profile ? (
          <div role="tabpanel" id={`${tabPrefix}-panel-profile`} aria-labelledby={`${tabPrefix}-tab-profile`} className="tw:grid tw:gap-5 tw:lg:grid-cols-2">
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
                <InfoItem term="Program Category">{programCategoryLabel(profile.programCategory)}</InfoItem>
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
            <section aria-label="Team downline" className="tw:flex tw:flex-col tw:gap-3">
              <AdminSectionHeading title="Team downline" icon={Network} description={`${directDownline.length} direct · ${downlineTotal} total`} />
              {directDownline.length === 0 ? (
                <p className="tw:p-4 tw:text-center tw:text-muted-foreground">No direct downline members.</p>
              ) : (
                <div className="tw:overflow-x-auto">
                  <GenealogyTree
                    nodes={downlineTree}
                    members={members}
                    selectedKey={null}
                    onSelect={() => {}}
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
              <AdminSectionHeading title="Relationship history" icon={History} />
              <DataTable
                data={member.parentHistory ?? []}
                columns={historyColumns}
                getRowId={(row) => `${row.changedAt}-${row.operation}-${row.actorId}`}
                emptyText="No relationship history."
                caption="Relationship history"
                onRowOpen={(row) => setHistoryKey(`${row.changedAt}-${row.operation}-${row.actorId}`)}
                getRowLabel={(row) => `Open ${humanize(row.operation)} change`}
                rowActions={(row) => <RowActionsMenu itemName={`${humanize(row.operation)} change`} onView={() => setHistoryKey(`${row.changedAt}-${row.operation}-${row.actorId}`)} />}
              />
              <RecordDetailsSheet
                open={historyDetail !== null}
                onClose={() => setHistoryKey(null)}
                title={historyDetail ? humanize(historyDetail.operation) : "Relationship change"}
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
    </AdminPage>
  );
}
