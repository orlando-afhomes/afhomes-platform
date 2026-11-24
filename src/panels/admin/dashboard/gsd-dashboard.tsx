"use client";

import Link from "next/link";
import { ScanLine, Search, Gift } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { DashboardHeader, DashboardCard } from "@/shared/components/dashboard/dashboard-layout";

/**
 * GSD Counter landing page: shortcuts only. The counter reads no record lists (it works on one
 * scanned cardholder at a time), so there are no counts here and no access is widened.
 */
export function GsdDashboard() {
  return (
    <>
      <DashboardHeader title="Counter Workspace" description="Scan a member's QR to earn or redeem points." />
      <div className="tw:mt-6 tw:max-w-2xl">
        <DashboardCard title="Start Here" description="Choose what you need at the counter" icon={ScanLine}>
          <div className="tw:flex tw:flex-col tw:gap-3 tw:sm:flex-row">
            <Link href="/admin/customer-lookup" className={buttonVariants({ variant: "success", className: "tw:min-h-11 tw:flex-1" })}>
              <ScanLine aria-hidden="true" /> Scan Member QR
            </Link>
            <Link href="/admin/customer-lookup" className={buttonVariants({ variant: "info", className: "tw:min-h-11 tw:flex-1" })}>
              <Search aria-hidden="true" /> Customer Search
            </Link>
            <Link href="/admin/stay-points" className={buttonVariants({ variant: "warning", className: "tw:min-h-11 tw:flex-1" })}>
              <Gift aria-hidden="true" /> Stay Points
            </Link>
          </div>
        </DashboardCard>
      </div>
    </>
  );
}
