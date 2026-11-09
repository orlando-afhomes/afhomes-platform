"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEffectiveModuleIds } from "@/data/queries";
import { getAdminBreadcrumbs } from "@/panels/admin/navigation";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";

/** Account-only view of Staff & Access: the single account directory. */
export const ACCOUNTS_COMPAT_TARGET = "/admin/organization/staff?view=account";

/**
 * Compatibility entry point for the former /admin/accounts route. It owns no
 * directory, forms, or data: holders of the non-delegable "accounts" grant
 * (Admin, Super Admin) are forwarded to Staff & Access; everyone else sees a
 * restriction and no account data is requested.
 */
export function AccountsCompatibilityPage() {
  const router = useRouter();
  const allowed = useEffectiveModuleIds().has("accounts");

  useEffect(() => {
    // replace, not push, so Back returns to the page before /admin/accounts.
    if (allowed) router.replace(ACCOUNTS_COMPAT_TARGET);
  }, [allowed, router]);

  return (
    <PageContainer>
      <Breadcrumbs items={getAdminBreadcrumbs("/admin/accounts")} />
      {allowed ? (
        <PageHeader title="Opening Staff & Access" description="Account administration now lives in Staff & Access." />
      ) : (
        <PageHeader title="Access restricted" description="This account does not have access to account administration." />
      )}
    </PageContainer>
  );
}
