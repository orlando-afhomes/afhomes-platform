"use client";

import Link from "next/link";
import { LoginForm } from "@/panels/public/login/login-form";
import { LoginShell } from "@/panels/public/login/login-shell";

export function SalesLoginPage() {
  return (
    <LoginShell>
      <LoginForm
        portals={[{ value: "sales", label: "Sales" }]}
        defaultPortal="sales"
        description="Sign in to sales network."
        extraLinks={
          <Link href="/register/ost" className="login-form__link">
            Register as OST
          </Link>
        }
      />
    </LoginShell>
  );
}
