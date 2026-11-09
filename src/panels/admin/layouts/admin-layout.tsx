"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { AdminHeader } from "../components/admin-header";
import { AdminSidebar } from "../components/admin-sidebar";

// Owns the sidebar collapsed state so the header toggle and the rail stay in sync.
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="tw:flex tw:min-h-screen tw:bg-background">
      <a
        href="#main-content"
        className="tw:sr-only tw:focus:not-sr-only tw:focus:fixed tw:focus:top-2 tw:focus:left-2 tw:focus:z-50 tw:focus:rounded-md tw:focus:bg-primary tw:focus:px-3 tw:focus:py-2 tw:focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AdminSidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <div
        className={cn(
          "tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:transition-[margin] tw:duration-200 tw:motion-reduce:transition-none",
          collapsed ? "tw:md:ml-20" : "tw:md:ml-60",
        )}
      >
        <AdminHeader collapsed={collapsed} onCollapse={setCollapsed} />
        <main id="main-content" className="tw:min-w-0 tw:flex-1 tw:bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
