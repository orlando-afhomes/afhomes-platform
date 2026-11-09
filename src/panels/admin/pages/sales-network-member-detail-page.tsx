"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AccreditationEligibilityTag } from "../components/accreditation-status";
import { DesignationBadge, toneFromColor } from "../components/sales-badges";
import { GenealogyTree } from "./sales-network-genealogy-page";

function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className={`tw:flex tw:flex-col tw:gap-2 tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-4 ${className ?? ""}`}>
      <h2 className="tw:text-base tw:font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const TWO_COLUMNS = "tw:sm:grid tw:sm:grid-cols-2 tw:sm:gap-x-8";

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
  const downlineTree = useMemo(() => {
    if (!member) return [];
    const descendantIds = getDescendantIds(member.id, members);
    const subset = members.filter((item) => item.id === member.id || descendantIds.has(item.id));
    const ids = new Set(subset.map((item) => item.id));
    return buildAuthorizedGenealogyTree(subset, ids).map((root) => ({ ...root, restrictedParent: false }));
  }, [member, members]);
  // The downline is fully expanded by default; the user can collapse branches.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const expandedKeys = useMemo(() => collectKeys(downlineTree).filter((key) => !collapsed.includes(key)), [downlineTree, collapsed]);

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
        <Skeleton className="tw:h-64 tw:w-full" />
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer>
        <p className="tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-8 tw:text-center tw:text-muted-foreground">Member not found or restricted.</p>
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

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Sales Network", href: "/admin/sales-network" },
          { label: "Members", href: "/admin/sales-network/members" },
          { label: member.displayName },
        ]}
      />
      <PageHeader
        title={member.displayName}
        description={`${designationLabel(member.designation)} · ${classification} · Team ${teamDisplayName(member, members)}`}
        actions={
          <Link href="/admin/sales-network/members" className={cn(buttonVariants({ variant: "outline" }), "tw:min-h-11 tw:sm:min-h-8")}>
            Back
          </Link>
        }
      />
      <div className="tw:mt-3 tw:grid tw:gap-4 tw:md:grid-cols-2">
        <Section title="Identity">
          <DetailList>
            <DetailRow term="AA Number">{aaDisplay(member)}</DetailRow>
            <DetailRow term="Position">
              <DesignationBadge designation={member.designation} full />
            </DetailRow>
            <DetailRow term="Member Status">
              <StatusBadge status={member.status} />
            </DetailRow>
            <DetailRow term="Team">{teamDisplayName(member, members)}</DetailRow>
          </DetailList>
        </Section>
        <Section title="Accreditation">
          <DetailList>
            <DetailRow term="AA Number">{currentAccreditation?.aaNumber ?? member.aaNumber ?? "Pending AA Issuance"}</DetailRow>
            <DetailRow term="Classification">{currentAccreditation?.classification ?? classification}</DetailRow>
            <DetailRow term="Accreditation Status">
              {display.kind === "none" ? (
                <StatusBadge status="No record" />
              ) : display.kind === "ambiguous" ? (
                <StatusBadge status="Review records" tone="warning" />
              ) : display.kind === "static" ? (
                <StatusBadge status={display.label} tone={display.color ? toneFromColor(display.color) : undefined} />
              ) : (
                <StatusBadge status={display.value === "active" ? "Accredited" : "Pending"} />
              )}
            </DetailRow>
            <DetailRow term="Original Accreditation Date">{currentAccreditation?.originalAccreditationDate ?? "—"}</DetailRow>
            <DetailRow term="Approved Start">{currentAccreditation?.effectiveDate ?? "—"}</DetailRow>
            <DetailRow term="Approved Expiry">{currentAccreditation?.expiryDate ?? "—"}</DetailRow>
            <DetailRow term="Validity">{eligibility ? <AccreditationEligibilityTag eligible={eligibility.eligible} /> : "—"}</DetailRow>
          </DetailList>
          {ambiguousAccreditation ? (
            <p role="note" className="tw:text-sm tw:text-muted-foreground">
              Multiple accreditation records share the latest date; status cannot be resolved automatically.
            </p>
          ) : null}
        </Section>
        {profile ? (
          <Section title="Seller Profile" className="tw:md:col-span-2">
            <DetailList className={TWO_COLUMNS}>
              <DetailRow term="First Name">{profile.firstName}</DetailRow>
              <DetailRow term="Middle Name">{profile.middleName ?? "—"}</DetailRow>
              <DetailRow term="Last Name">{profile.lastName}</DetailRow>
              {profile.suffix ? <DetailRow term="Suffix">{profile.suffix}</DetailRow> : null}
              <DetailRow term="Mobile Number">{profile.mobileNumber}</DetailRow>
              <DetailRow term="Date of Birth">{profile.dateOfBirth}</DetailRow>
              <DetailRow term="Email">{profile.email}</DetailRow>
              <DetailRow term="Number / Street">{profile.address.street}</DetailRow>
              <DetailRow term="Barangay">{profile.address.barangay}</DetailRow>
              <DetailRow term="City / Municipality">{profile.address.city}</DetailRow>
              <DetailRow term="Province">{profile.address.province}</DetailRow>
              {profile.address.subdivision ? <DetailRow term="Subdivision / Village">{profile.address.subdivision}</DetailRow> : null}
              <DetailRow term="ZIP / Postal Code">{profile.address.postalCode}</DetailRow>
              <DetailRow term="Government ID">{profile.governmentIdType}</DetailRow>
              <DetailRow term="Government ID Number">{maskGovIdNumber(profile.governmentIdNumber)}</DetailRow>
              <DetailRow term="Date of Card Application">{profile.cardApplicationDate}</DetailRow>
              <DetailRow term="Program Category">{programCategoryLabel(profile.programCategory)}</DetailRow>
              <DetailRow term="VIP Card Level">{store.products.find((product) => product.code === profile.vipCardLevel)?.name ?? profile.vipCardLevel}</DetailRow>
              <DetailRow term="Gender">{profile.gender}</DetailRow>
              <DetailRow term="Civil Status">{profile.civilStatus}</DetailRow>
              {profile.telephone ? <DetailRow term="Telephone / Landline">{profile.telephone}</DetailRow> : null}
              {profile.facebook ? <DetailRow term="Facebook / Messenger">{profile.facebook}</DetailRow> : null}
              {profile.tin ? <DetailRow term="TIN">{profile.tin}</DetailRow> : null}
              {profile.businessEmployer ? <DetailRow term="Business / Employer">{profile.businessEmployer}</DetailRow> : null}
              {profile.businessAddress ? <DetailRow term="Business / Employer Address">{profile.businessAddress}</DetailRow> : null}
              {profile.jobPosition ? <DetailRow term="Job Position">{profile.jobPosition}</DetailRow> : null}
              <DetailRow term="Profile Photo">
                <Avatar className="tw:size-16 tw:text-base">
                  {profile.profilePhotoUrl ? <AvatarImage src={profile.profilePhotoUrl} alt={`Profile photo of ${member.displayName}`} /> : null}
                  <AvatarFallback aria-label={`No profile photo for ${member.displayName}`}>
                    {`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DetailRow>
              <DetailRow term="Seller Source">Manual admin creation</DetailRow>
            </DetailList>
          </Section>
        ) : null}
        <Section title="Team downline" className="tw:md:col-span-2">
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
        </Section>
        {member.parentHistory && member.parentHistory.length > 0 ? (
          <Section title="Relationship history" className="tw:md:col-span-2">
            <div className="tw:overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Previous parent</TableHead>
                    <TableHead>New parent</TableHead>
                    <TableHead>Previous branch</TableHead>
                    <TableHead>New branch</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.parentHistory.map((record, index) => (
                    <TableRow key={`${record.changedAt}-${index}`}>
                      <TableCell>{record.operation}</TableCell>
                      <TableCell>{record.previousParentId ?? "—"}</TableCell>
                      <TableCell>{record.newParentId ?? "—"}</TableCell>
                      <TableCell>{record.previousBranchId}</TableCell>
                      <TableCell>{record.newBranchId}</TableCell>
                      <TableCell>{record.actorId}</TableCell>
                      <TableCell>{record.changedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>
        ) : null}
      </div>
    </PageContainer>
  );
}
