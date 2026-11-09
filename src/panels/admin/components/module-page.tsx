"use client";

import type { ReactNode } from "react";
import { useEffectiveModuleIds } from "@/data/queries";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { Breadcrumbs, type BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Toaster } from "@/shared/ui/sonner";

/**
 * Standard shell of a business-module page: access check, toast host,
 * breadcrumbs and page header. `anyOf` lets one screen serve several modules
 * (for example the shared contract detail). Record-level scope is still
 * enforced by the repositories.
 */
export function ModulePage({
  anyOf,
  title,
  description,
  crumbs,
  actions,
  children,
}: {
  anyOf: AdminModuleId[];
  title: string;
  description?: string;
  crumbs: BreadcrumbItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const granted = useEffectiveModuleIds();
  if (!anyOf.some((moduleId) => granted.has(moduleId))) {
    return (
      <PageContainer>
        <PageHeader title="Access restricted" description={`This account does not have access to ${title}.`} />
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <Toaster position="top-right" />
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, ...crumbs]} />
      <PageHeader title={title} description={description} actions={actions} />
      <div className="tw:mt-4 tw:flex tw:flex-col tw:gap-6">{children}</div>
    </PageContainer>
  );
}
