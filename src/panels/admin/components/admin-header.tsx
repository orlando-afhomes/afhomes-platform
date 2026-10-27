"use client";

import Link from "next/link";
import { Avatar, Dropdown, Layout } from "antd";
import type { MenuProps } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { ChevronDown, Menu as MenuIcon } from "lucide-react";
import { AdminMobileNav } from "./admin-mobile-nav";
import { useLogout } from "../use-logout";
import { getRoleDisplayLabel } from "../role-label";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { activeRoles } from "@/data/mock/dev-identities";
import { useMemo } from "react";

const { Header } = Layout;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

// Layout-critical values use the style prop: antd injects its component
// styles at runtime after static CSS, so a module class would lose ties.
export function AdminHeader({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}) {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const logout = useLogout();
  const roles = useMemo(() => activeRoles(identity), [identity]);

  const avatarUrl = useMemo(() => {
    if (!identity.staffId) return null;
    return store.staff.find((member) => member.id === identity.staffId)?.avatarUrl ?? null;
  }, [store, identity]);

  const menuItems: MenuProps["items"] = [
    {
      key: "account",
      label: <Link href="/admin/account">My Account</Link>,
      icon: (
        <span aria-hidden="true" className="admin-header__menu-icon">
          <UserOutlined />
        </span>
      ),
    },
    {
      key: "logout",
      danger: true,
      label: <span className="admin-header__menu-logout">Log out</span>,
      icon: (
        <span aria-hidden="true" className="admin-header__menu-icon">
          <LogoutOutlined />
        </span>
      ),
      onClick: () => logout(),
    },
  ];

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 64,
        padding: "0 16px",
        background: "#fbfaf7",
        borderBottom: "1px solid #e5e0d4",
      }}
    >
      <AdminMobileNav />
      <button
        type="button"
        aria-label="Open navigation"
        className="admin-header__collapse-btn"
        onClick={() => onCollapse(!collapsed)}
      >
        <MenuIcon className="size-4" />
      </button>
      <div className="admin-header__profile">
        <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
          <button type="button" className="admin-header__profile-button" aria-label={`Account options for ${identity.displayName}`}>
            <Avatar size={32} src={avatarUrl ?? undefined} className="admin-header__profile-avatar">
              {avatarUrl ? null : initials(identity.displayName)}
            </Avatar>
            <span className="admin-header__profile-text">
              <span className="admin-header__profile-name">{identity.displayName}</span>
              <span className="admin-header__profile-role">{getRoleDisplayLabel(roles)}</span>
            </span>
            <ChevronDown className="size-4 admin-header__profile-chevron" aria-hidden />
          </button>
        </Dropdown>
      </div>
    </Header>
  );
}
