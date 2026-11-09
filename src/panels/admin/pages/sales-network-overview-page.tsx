"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMembers } from "@/data/queries";
import { PageContainer } from "@/shared/components/modern/page-container";
import { DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { SalesNetworkPanel } from "../components/sales-network-panel";
import { CardSection } from "@/shared/components/modern/card-section";

export function SalesNetworkOverviewPage() {
  const { identity } = useDevIdentity();
  const membersQuery = useMembers();
  const currentMember = (membersQuery.data ?? []).find((member) => member.id === identity.memberId) ?? null;

  return (
    <PageContainer>
      <div className="tw:flex tw:flex-col tw:gap-4">
        <SalesNetworkPanel />
        {currentMember ? (
          <CardSection title="My referral code">
            <DetailList>
              <DetailRow term="Code">{currentMember.referralCode ?? "—"}</DetailRow>
              <DetailRow term="Status">{currentMember.referralCode ? "Existing code" : "No code assigned"}</DetailRow>
            </DetailList>
          </CardSection>
        ) : null}
        <div>
          <Link href="/admin/sales-network/members" className={cn(buttonVariants({}), "tw:min-h-11 tw:sm:min-h-8")}>
            Open members directory <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
