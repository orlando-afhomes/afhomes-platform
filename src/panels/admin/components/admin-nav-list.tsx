"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "antd";
import type { AdminNavItem } from "../navigation";
import { findOpenKeys, findSelectedKeys, toAntdMenuItems } from "./admin-menu-items";

export function AdminNavList({
  items,
  onNavigate,
  pathname: pathnameProp,
}: {
  items?: AdminNavItem[];
  onNavigate?: () => void;
  pathname?: string | null;
}) {
  const hookPathname = usePathname();
  const pathname = pathnameProp ?? hookPathname ?? "/";
  const [openKeys, setOpenKeys] = useState<string[]>(() => findOpenKeys(items ?? [], pathname));

  return (
    <Menu
      mode="inline"
      theme="dark"
      className="admin-sidebar__menu"
      items={toAntdMenuItems(items ?? [], onNavigate)}
      selectedKeys={findSelectedKeys(items ?? [], pathname)}
      openKeys={openKeys}
      onOpenChange={(keys) => setOpenKeys(keys)}
    />
  );
}
