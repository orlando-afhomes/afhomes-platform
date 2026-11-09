"use client";

import { useOperation, usePayments } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
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
        <Section title="Finance and collections" description="Verified Collections use the Finance verification date. Reservation payments are part of the price and are never counted twice.">
          <StatTiles items={[{ label: "Verified collections", value: <Money value={collected} /> }, { label: "Reversed or refunded", value: <Money value={adjusted} /> }, { label: "Net verified collections", value: <Money value={collected - adjusted} /> }, { label: "Payments awaiting verification", value: paymentList.filter((item) => item.status === "submitted" || item.status === "under_review").length }]} />
        </Section>
      ) : (
        <InfoNote>Access restricted. Your role may not view Finance collections reports.</InfoNote>
      )}
    </ReportShell>
  );
}
