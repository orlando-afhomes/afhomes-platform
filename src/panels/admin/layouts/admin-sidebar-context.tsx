"use client";

import { createContext, useContext } from "react";

type AdminSidebarState = { collapsed: boolean; setCollapsed: (value: boolean) => void };

const NO_SIDEBAR: AdminSidebarState = { collapsed: false, setCollapsed: () => undefined };

export const AdminSidebarContext = createContext<AdminSidebarState | null>(null);

/** Lets a page collapse or expand the desktop sidebar. Outside the admin layout (tests, previews) it is a harmless no-op. */
export function useAdminSidebar(): AdminSidebarState {
  return useContext(AdminSidebarContext) ?? NO_SIDEBAR;
}
