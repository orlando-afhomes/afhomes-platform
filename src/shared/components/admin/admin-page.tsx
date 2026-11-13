"use client";

import type { ReactNode } from "react";
import { useEffectiveModuleIds } from "@/data/queries";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { Breadcrumbs, type BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { PageContainer } from "@/shared/components/modern/page-container";
import { StatusLink, StatusPage } from "@/shared/components/status/status-page";

/**
 * Standard admin page shell: module gate, breadcrumbs, dashboard-scale
 * heading, and content column. Presentation only; access and record scope
 * stay with the repositories.
 */
export function AdminPage({
  anyOf,
  title,
  description,
  crumbs,
  actions,
  allowed = true,
  children,
}: {
  anyOf: readonly AdminModuleId[];
  title: string;
  description?: string;
  crumbs: BreadcrumbItem[];
  actions?: ReactNode;
  allowed?: boolean;
  children: ReactNode;
}) {
  const granted = useEffectiveModuleIds();
  if (!allowed || !anyOf.some((moduleId) => granted.has(moduleId))) {
    return (
      <PageContainer>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, ...crumbs]} />
        <StatusPage variant="403" embedded description={`This account does not have access to ${title}.`}>
          <StatusLink href="/admin" primary>
            Back to dashboard
          </StatusLink>
        </StatusPage>
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, ...crumbs]} />
      <div className="tw:mt-1 tw:flex tw:flex-col tw:gap-4 tw:sm:flex-row tw:sm:items-start tw:sm:justify-between">
        <div className="tw:min-w-0">
          <h1 className="tw:text-[1.75rem] tw:leading-tight tw:font-bold tw:tracking-tight tw:text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="tw:mt-1.5 tw:text-sm tw:text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-2">{actions}</div> : null}
      </div>
      <div className="tw:mt-6 tw:flex tw:flex-col tw:gap-6">{children}</div>
    </PageContainer>
  );
}
