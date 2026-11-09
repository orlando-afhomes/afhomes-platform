"use client";

import { useMemo, useState } from "react";
import { useCommissions, useMemberships, useOperation, usePayments, useSales, useStayPoints } from "@/data/business-queries";
import { useCustomers } from "@/data/queries";
import { confirmedValueInPeriod, totalsFor } from "@/modules/sales/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { StandardDateField } from "@/shared/forms/modern";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { ModulePage } from "../components/module-page";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Past 7 Days" },
  { value: "28d", label: "Past 28 Days" },
  { value: "6m", label: "Past 6 Months" },
  { value: "custom", label: "Custom range" },
];

function addDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Read-only reports. Each figure filters on its own source event date and reports never create transactions (doc 11). */
export function ReportsPage() {
  const sales = useSales();
  const payments = usePayments();
  const commissions = useCommissions();
  const memberships = useMemberships();
  const points = useStayPoints();
  const customers = useCustomers();
  const finance = useOperation("finance.reports.view");
  const today = manilaToday();
  const [preset, setPreset] = useState("28d");
  const [customFrom, setCustomFrom] = useState(addDays(today, -28));
  const [customTo, setCustomTo] = useState(today);

  const range = useMemo(() => {
    if (preset === "today") return { from: today, to: today };
    if (preset === "7d") return { from: addDays(today, -7), to: today };
    if (preset === "28d") return { from: addDays(today, -28), to: today };
    if (preset === "6m") return { from: addMonthsToDate(today, -6) ?? today, to: today };
    return { from: customFrom, to: customTo };
  }, [preset, today, customFrom, customTo]);
  const { from, to } = range;
  const inRange = (date: string | null | undefined) => Boolean(date) && (date as string).slice(0, 10) >= from && (date as string).slice(0, 10) <= to;

  const saleList = sales.data ?? [];
  const totals = totalsFor(saleList);
  const confirmedInPeriod = confirmedValueInPeriod(saleList, from, to);
  const paymentList = payments.data ?? [];
  const collected = paymentList.filter((item) => inRange(item.verifiedDate)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const adjusted = paymentList.flatMap((item) => item.adjustments).filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const commissionList = commissions.data ?? [];
  const approvedInPeriod = commissionList.filter((item) => inRange(item.approvedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const paidInPeriod = commissionList.filter((item) => inRange(item.payout?.confirmedAt)).reduce((sum, item) => sum + item.amountCentavos, 0);
  const membershipList = memberships.data ?? [];
  const activatedInPeriod = membershipList.filter((item) => inRange(item.activationDate)).length;
  const byTier = ["B1", "S1", "G1"].map((code) => ({ code, count: membershipList.filter((item) => item.productCode === code && item.status === "active").length }));
  const pointsList = points.data ?? [];
  const earned = pointsList.flatMap((item) => item.ledger.entries).filter((item) => inRange(item.date) && (item.status === "spendable" || item.status === "pending" || item.status === "held")).reduce((sum, item) => sum + item.earnedWeekday + item.earnedWeekend, 0);
  const customerList = customers.data ?? [];
  const newCustomers = customerList.filter((item) => inRange(item.createdAt)).length;

  return (
    <ModulePage anyOf={["reports"]} title="Reports" description="Role-scoped figures built from the source records. Each figure uses its own event date." crumbs={[{ label: "Reports" }]}>
      <FilterBar filters={[{ label: "Date range", value: preset, onChange: setPreset, options: PRESETS }]}>
        {preset === "custom" ? (
          <div className="tw:grid tw:grid-cols-2 tw:gap-2">
            <StandardDateField label="Start date" value={customFrom} onChange={setCustomFrom} />
            <StandardDateField label="End date" value={customTo} onChange={setCustomTo} />
          </div>
        ) : null}
      </FilterBar>
      <InfoNote>Showing {from} to {to} (Asia/Manila). Sales Performance, Finance and Commission figures are limited to what your role may see. No targets or unapproved formulas are shown.</InfoNote>
      <Section title="Sales performance" description="Confirmed Sales Value counts each sale once at its full contract value on the Finance confirmation date.">
        <StatTiles items={[{ label: "Confirmed sales value (period)", value: <Money value={confirmedInPeriod} />, hint: "Net of reversals" }, { label: "Confirmed (all time)", value: <Money value={totals.confirmed} />, hint: `${totals.confirmedCount} sale(s)` }, { label: "Pending", value: <Money value={totals.pending} />, hint: `${totals.pendingCount} sale(s)` }, { label: "Overall recorded", value: <Money value={totals.overall} /> }]} />
      </Section>
      {finance ? (
        <Section title="Finance and collections" description="Verified Collections use the Finance verification date. Reservation payments are part of the price and are never counted twice.">
          <StatTiles items={[{ label: "Verified collections", value: <Money value={collected} /> }, { label: "Reversed or refunded", value: <Money value={adjusted} /> }, { label: "Net verified collections", value: <Money value={collected - adjusted} /> }, { label: "Payments awaiting verification", value: paymentList.filter((item) => item.status === "submitted" || item.status === "under_review").length }]} />
        </Section>
      ) : null}
      <Section title="Commission obligations" description="Approved is not Paid. Approvals use the approval date; payouts use the confirmed disbursement date.">
        <StatTiles items={[{ label: "Approved in period", value: <Money value={approvedInPeriod} /> }, { label: "Paid in period", value: <Money value={paidInPeriod} /> }, { label: "Approved, unpaid", value: <Money value={commissionList.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amountCentavos, 0)} /> }, { label: "On hold", value: <Money value={commissionList.filter((item) => item.status === "on_hold").reduce((sum, item) => sum + item.amountCentavos, 0)} /> }]} />
      </Section>
      <Section title="Membership distribution" description="Memberships count from official activation.">
        <StatTiles items={[{ label: "Activated in period", value: activatedInPeriod }, ...byTier.map((tier) => ({ label: `Active ${tier.code}`, value: tier.count }))]} />
      </Section>
      <Section title="Stay points" description="Points use the verified earning date. Redemption reporting is not available while Redemption is disabled.">
        <StatTiles items={[{ label: "Points earned in period", value: earned.toLocaleString("en-PH") }, { label: "Spendable (all)", value: pointsList.reduce((sum, item) => sum + item.ledger.balances.spendableWeekday + item.ledger.balances.spendableWeekend, 0).toLocaleString("en-PH") }, { label: "Pending (all)", value: pointsList.reduce((sum, item) => sum + item.ledger.balances.pending, 0).toLocaleString("en-PH") }, { label: "Held (all)", value: pointsList.reduce((sum, item) => sum + item.ledger.balances.held, 0).toLocaleString("en-PH") }]} />
      </Section>
      <Section title="Customer growth">
        <StatTiles items={[{ label: "New customers in period", value: newCustomers, hint: "By record creation date" }, { label: "Visible customers", value: customerList.length }]} />
      </Section>
    </ModulePage>
  );
}
