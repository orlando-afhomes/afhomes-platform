"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import type { OrgMember } from "@/modules/organization/types";
import { Avatar, Button, Card, Descriptions, Empty, Image, Skeleton, Space, Table, Tag, Tree } from "antd";
import Link from "next/link";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useMembers, useSalesNetworkMemberByKey, useMemberAccreditations } from "@/data/queries";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { getDescendantIds } from "@/data/mock/scope";
import { buildAuthorizedGenealogyTree, type GenealogyTreeNode } from "@/modules/sales-network/genealogy";
import { resolveEffectiveAccreditationEligibility, getCurrentAccreditationRecord, hasAmbiguousAccreditation } from "@/modules/accreditation/eligibility";
import { manilaToday } from "@/modules/accreditation/dates";
import {
  aaDisplay,
  designationLabel,
  DESIGNATION_COLORS,
  resolveAccreditationDisplay,
  teamDisplayName,
} from "@/modules/sales-network/display";
import { programCategoryLabel } from "@/modules/sales-network/accredited-seller";
import { maskGovIdNumber } from "@/shared/forms";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { AccreditationEligibilityTag } from "../components/accreditation-status";
import { StatusBadge } from "@/shared/components/layout/status-badge";
import { SalesNetworkTreeNodeTitle } from "../components/sales-network-tree-node";
import "../components/sales-network-tree-node.css";

function toDownlineTreeData(nodes: GenealogyTreeNode[], members: readonly OrgMember[]): any[] {
  return nodes.map((node) => ({
    key: node.key,
    title: <SalesNetworkTreeNodeTitle node={node} members={members} />,
    children: toDownlineTreeData(node.children, members),
  }));
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
  const members = membersQuery.data ?? [];
  const accreditations = accreditationsQuery.data ?? [];
  const currentAccreditation = getCurrentAccreditationRecord(accreditations);
  const ambiguousAccreditation = hasAmbiguousAccreditation(accreditations);
  const eligibility = member
    ? resolveEffectiveAccreditationEligibility(member, accreditations, manilaToday())
    : null;
  const directDownline = member ? members.filter((item) => item.parentId === member.id) : [];
  const downlineTree = useMemo(() => {
    if (!member) return [];
    const descendantIds = getDescendantIds(member.id, members);
    const subset = members.filter((item) => item.id === member.id || descendantIds.has(item.id));
    const ids = new Set(subset.map((item) => item.id));
    return buildAuthorizedGenealogyTree(subset, ids).map((root) => ({ ...root, restrictedParent: false }));
  }, [member, members]);

  if (!granted.has("sales-network")) {
    return (
      <div className="sales-member-detail-page">
        <PageContainer>
          <PageHeader title="Access restricted" description="This account does not have access to Sales Network." />
        </PageContainer>
      </div>
    );
  }

  if (memberQuery.isLoading) {
    return (
      <div className="sales-member-detail-page">
        <PageContainer>
          <Skeleton active paragraph={{ rows: 8 }} />
        </PageContainer>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="sales-member-detail-page">
        <PageContainer>
          <Empty description="Member not found or restricted." />
          <div className="sales-member-detail-page__actions">
            <Link href="/admin/sales-network/members">
              <Button>Back to members</Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  const classification = member.designation === "OST" ? "OST" : "IST";

  return (
    <div className="sales-member-detail-page">
      <PageContainer>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Sales Network", href: "/admin/sales-network" }, { label: "Members", href: "/admin/sales-network/members" }, { label: member.displayName }]} />
        <PageHeader
          title={member.displayName}
          description={`${designationLabel(member.designation)} · ${classification} · Team ${teamDisplayName(member, members)}`}
          actions={
            <Space>
              <Link href="/admin/sales-network/members">
                <Button>Back</Button>
              </Link>
            </Space>
          }
        />
        <div className="sales-member-detail-page__grid">
          <Card title="Identity">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="AA Number">{aaDisplay(member)}</Descriptions.Item>
              <Descriptions.Item label="Position">
                <Tag color={DESIGNATION_COLORS[member.designation]}>{designationLabel(member.designation)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Member Status"><StatusBadge status={member.status} /></Descriptions.Item>
              <Descriptions.Item label="Team">{teamDisplayName(member, members)}</Descriptions.Item>
            </Descriptions>
          </Card>
          <Card title="Accreditation">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="AA Number">{currentAccreditation?.aaNumber ?? member.aaNumber ?? "Pending AA Issuance"}</Descriptions.Item>
              <Descriptions.Item label="Classification">{currentAccreditation?.classification ?? classification}</Descriptions.Item>
              <Descriptions.Item label="Accreditation Status">
                {(() => {
                  const display = resolveAccreditationDisplay(accreditations);
                  if (display.kind === "none") return <StatusBadge status="No record" />;
                  if (display.kind === "ambiguous") return <StatusBadge status="Review records" color="gold" />;
                  if (display.kind === "static") return <StatusBadge status={display.label} color={display.color} />;
                  return <StatusBadge status={display.value === "active" ? "Accredited" : "Pending"} />;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Original Accreditation Date">{currentAccreditation?.originalAccreditationDate ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Approved Start">{currentAccreditation?.effectiveDate ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Approved Expiry">{currentAccreditation?.expiryDate ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Validity">
                {eligibility ? <AccreditationEligibilityTag eligible={eligibility.eligible} /> : "—"}
              </Descriptions.Item>
            </Descriptions>
            {ambiguousAccreditation ? (
              <p className="sales-member-detail__empty">Multiple accreditation records share the latest date; status cannot be resolved automatically.</p>
            ) : null}
          </Card>
          {member.sellerProfile ? (
            <Card title="Seller Profile" className="sales-member-detail-page__wide">
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="First Name">{member.sellerProfile.firstName}</Descriptions.Item>
                <Descriptions.Item label="Middle Name">{member.sellerProfile.middleName ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Last Name">{member.sellerProfile.lastName}</Descriptions.Item>
                {member.sellerProfile.suffix ? <Descriptions.Item label="Suffix">{member.sellerProfile.suffix}</Descriptions.Item> : null}
                <Descriptions.Item label="Mobile Number">{member.sellerProfile.mobileNumber}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">{member.sellerProfile.dateOfBirth}</Descriptions.Item>
                <Descriptions.Item label="Email">{member.sellerProfile.email}</Descriptions.Item>
                <Descriptions.Item label="Number / Street">{member.sellerProfile.address.street}</Descriptions.Item>
                <Descriptions.Item label="Barangay">{member.sellerProfile.address.barangay}</Descriptions.Item>
                <Descriptions.Item label="City / Municipality">{member.sellerProfile.address.city}</Descriptions.Item>
                <Descriptions.Item label="Province">{member.sellerProfile.address.province}</Descriptions.Item>
                {member.sellerProfile.address.subdivision ? <Descriptions.Item label="Subdivision / Village">{member.sellerProfile.address.subdivision}</Descriptions.Item> : null}
                <Descriptions.Item label="ZIP / Postal Code">{member.sellerProfile.address.postalCode}</Descriptions.Item>
                <Descriptions.Item label="Government ID">{member.sellerProfile.governmentIdType}</Descriptions.Item>
                <Descriptions.Item label="Government ID Number">{maskGovIdNumber(member.sellerProfile.governmentIdNumber)}</Descriptions.Item>
                <Descriptions.Item label="Date of Card Application">{member.sellerProfile.cardApplicationDate}</Descriptions.Item>
                <Descriptions.Item label="Program Category">{programCategoryLabel(member.sellerProfile.programCategory)}</Descriptions.Item>
                <Descriptions.Item label="VIP Card Level">
                  {store.products.find((product) => product.code === member.sellerProfile?.vipCardLevel)?.name ?? member.sellerProfile.vipCardLevel}
                </Descriptions.Item>
                <Descriptions.Item label="Gender">{member.sellerProfile.gender}</Descriptions.Item>
                <Descriptions.Item label="Civil Status">{member.sellerProfile.civilStatus}</Descriptions.Item>
                {member.sellerProfile.telephone ? <Descriptions.Item label="Telephone / Landline">{member.sellerProfile.telephone}</Descriptions.Item> : null}
                {member.sellerProfile.facebook ? <Descriptions.Item label="Facebook / Messenger">{member.sellerProfile.facebook}</Descriptions.Item> : null}
                {member.sellerProfile.tin ? <Descriptions.Item label="TIN">{member.sellerProfile.tin}</Descriptions.Item> : null}
                {member.sellerProfile.businessEmployer ? <Descriptions.Item label="Business / Employer">{member.sellerProfile.businessEmployer}</Descriptions.Item> : null}
                {member.sellerProfile.businessAddress ? <Descriptions.Item label="Business / Employer Address">{member.sellerProfile.businessAddress}</Descriptions.Item> : null}
                {member.sellerProfile.jobPosition ? <Descriptions.Item label="Job Position">{member.sellerProfile.jobPosition}</Descriptions.Item> : null}
                <Descriptions.Item label="Profile Photo">
                  {member.sellerProfile.profilePhotoUrl ? (
                    <Image
                      width={64}
                      src={member.sellerProfile.profilePhotoUrl}
                      alt={`Profile photo of ${member.displayName}`}
                      className="sales-member-detail__photo"
                      fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='%23e8f1ec'/></svg>"
                    />
                  ) : (
                    <Avatar size={64} className="sales-member-detail__photo-fallback" aria-label={`No profile photo for ${member.displayName}`}>
                      {`${member.sellerProfile.firstName.charAt(0)}${member.sellerProfile.lastName.charAt(0)}`.toUpperCase()}
                    </Avatar>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Seller Source">Manual admin creation</Descriptions.Item>
              </Descriptions>
            </Card>
          ) : null}
          <Card title="Team downline" className="sales-member-detail-page__wide">
            {directDownline.length === 0 ? (
              <Empty description="No direct downline members." />
            ) : (
              <div className="sales-member-detail__tree-wrap">
                <Tree
                  showLine
                  defaultExpandAll
                  treeData={toDownlineTreeData(downlineTree, members)}
                  className="genealogy-tree"
                />
              </div>
            )}
          </Card>
          {member.parentHistory && member.parentHistory.length > 0 ? (
            <Card title="Relationship history" className="sales-member-detail-page__wide">
              <Table
                rowKey={(record, index) => `${record.changedAt}-${index}`}
                pagination={false}
                dataSource={member.parentHistory}
                columns={[
                  { title: "Operation", dataIndex: "operation", key: "operation" },
                  { title: "Previous parent", dataIndex: "previousParentId", key: "previousParentId", render: (value: string | null) => value ?? "—" },
                  { title: "New parent", dataIndex: "newParentId", key: "newParentId", render: (value: string | null) => value ?? "—" },
                  { title: "Previous branch", dataIndex: "previousBranchId", key: "previousBranchId" },
                  { title: "New branch", dataIndex: "newBranchId", key: "newBranchId" },
                  { title: "Actor", dataIndex: "actorId", key: "actorId" },
                  { title: "Timestamp", dataIndex: "changedAt", key: "changedAt" },
                ]}
              />
            </Card>
          ) : null}
        </div>
      </PageContainer>
    </div>
  );
}