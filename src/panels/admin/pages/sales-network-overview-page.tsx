"use client";

import Link from "next/link";
import { Button, Card, Descriptions } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers } from "@/data/queries";
import { PageContainer } from "@/shared/components/layout/page-container";
import { SalesNetworkPanel } from "../components/sales-network-panel";

export function SalesNetworkOverviewPage() {
  const { identity } = useDevIdentity();
  const membersQuery = useMembers();
  const currentMember = (membersQuery.data ?? []).find((member) => member.id === identity.memberId) ?? null;

  return (
    <PageContainer>
      <div className="sales-network-overview">
        <SalesNetworkPanel />
        {currentMember ? (
          <Card title="My referral code" className="sales-network-overview__referral">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Code">{currentMember.referralCode ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Status">{currentMember.referralCode ? "Existing code" : "No code assigned"}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : null}
        <div className="sales-network-overview__actions">
          <Link href="/admin/sales-network/members">
            <Button type="primary" icon={<ArrowRightOutlined />}>
              Open members directory
            </Button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}