"use client";

import { DevIdentitySelector } from "@/panels/admin/components/dev-identity-selector";

export function AdminDashboardPage() {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          AFhomes administration foundation. Authorized modules and operational data will be available here.
        </p>
      </div>

      {isDevelopment ? <DevIdentitySelector /> : null}
    </div>
  );
}
