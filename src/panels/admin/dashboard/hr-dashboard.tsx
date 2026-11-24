"use client";

import { Building2, Users } from "lucide-react";
import { useDepartments, useStaff } from "@/data/queries";
import { DashboardHeader } from "@/shared/components/dashboard/dashboard-layout";
import { DashboardPendingActions, DashboardPendingItem } from "@/shared/components/dashboard/dashboard-pending-actions";

/** HR landing page: head counts only, each linking to the page where HR manages them. No pay or personal details. */
export function HrDashboard() {
  const departments = useDepartments();
  const staff = useStaff();
  const activeDepartments = (departments.data ?? []).filter((department) => department.status === "active").length;
  const activeStaff = (staff.data ?? []).filter((member) => member.status === "active").length;

  return (
    <>
      <DashboardHeader title="People Overview" description="Departments and staff you manage." />
      <div className="tw:mt-6 tw:max-w-2xl">
        <DashboardPendingActions title="Organization" description="Open an item to manage it">
          <DashboardPendingItem
            href="/admin/organization?tab=departments"
            label="Active departments"
            count={activeDepartments}
            icon={Building2}
            tone="info"
            loading={departments.isLoading}
            error={departments.error}
          />
          <DashboardPendingItem
            href="/admin/organization?tab=staff"
            label="Active staff members"
            count={activeStaff}
            icon={Users}
            tone="brand"
            loading={staff.isLoading}
            error={staff.error}
          />
        </DashboardPendingActions>
      </div>
    </>
  );
}
