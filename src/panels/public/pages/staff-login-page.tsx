"use client";

import { LoginForm } from "@/panels/public/login/login-form";
import { LoginShell } from "@/panels/public/login/login-shell";

export function StaffLoginPage() {
  return (
    <LoginShell>
      <LoginForm
        portals={[
          { value: "admin", label: "Admin" },
          { value: "staff", label: "Staff" },
        ]}
        defaultPortal="admin"
        description="Sign in to your workspace."
      />
    </LoginShell>
  );
}
