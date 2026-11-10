"use client";

import { BadgeCheck, Clock, RotateCcw, Wallet } from "lucide-react";
import { useOperation, usePayments } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { AdminStatCard, AdminStatGrid, AdminSection } from "@/shared/components/admin";
import { ReportShell, useReportRange } from "../components/report-shell";

export function CollectionsReportPage() {
  const range = useReportRange();
  const payments = usePayments();
  const finance = useOperation("finance.reports.view");
  const paymentList = payments.data ?? [];
  const { gross: collected, adjusted } = periodCollections(paymentList, range.from, range.to);
  return (
    <ReportShell range={range} title="Collections Report" description="Verified collections from the Finance source records." crumbs={[{ label: "Reports" }, { label: "Collections Report" }]}>
      {finance ? (
        <AdminSection title="Finance and collections" description="Verified Collections use the Finance verification date. Reservation payments are part of the price and are never counted twice.">
          <AdminStatGrid>
            <AdminStatCard label="Verified collections" value={<Money value={collected} />} icon={BadgeCheck} tone="success" />
            <AdminStatCard label="Reversed or refunded" value={<Money value={adjusted} />} icon={RotateCcw} tone="danger" />
            <AdminStatCard label="Net verified collections" value={<Money value={collected - adjusted} />} icon={Wallet} tone="brand" />
            <AdminStatCard label="Payments awaiting verification" value={paymentList.filter((item) => item.status === "submitted" || item.status === "under_review").length} icon={Clock} tone="warning" />
          </AdminStatGrid>
        </AdminSection>
      ) : (
        <InfoNote>Access restricted. Your role may not view Finance collections reports.</InfoNote>
      )}
    </ReportShell>
  );
}
