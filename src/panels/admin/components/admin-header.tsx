"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Menu as MenuIcon, User } from "lucide-react";
import { AdminMobileNav } from "./admin-mobile-nav";
import { useLogout } from "../use-logout";
import { getRoleDisplayLabel } from "../role-label";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { activeRoles } from "@/data/mock/dev-identities";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function AdminHeader({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}) {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const { logout, dialog } = useLogout();
  const roles = useMemo(() => activeRoles(identity), [identity]);

  const avatarUrl = useMemo(() => {
    if (!identity.staffId) return null;
    return store.staff.find((member) => member.id === identity.staffId)?.avatarUrl ?? null;
  }, [store, identity]);

  return (
    <header className="tw:sticky tw:top-0 tw:z-20 tw:flex tw:h-16 tw:shrink-0 tw:items-center tw:gap-2 tw:border-b tw:border-border tw:bg-background tw:px-4">
      <AdminMobileNav />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={collapsed}
        className="tw:hidden tw:md:inline-flex"
        onClick={() => onCollapse(!collapsed)}
      >
        <MenuIcon aria-hidden="true" />
      </Button>
      <div className="tw:ml-auto tw:flex tw:items-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={`Account options for ${identity.displayName}`}
                className="tw:inline-flex tw:min-h-11 tw:items-center tw:gap-2.5 tw:rounded-lg tw:px-2 tw:py-1 tw:text-left tw:hover:bg-muted tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none"
              />
            }
          >
            <Avatar className="tw:size-8 tw:text-xs">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials(identity.displayName)}</AvatarFallback>
            </Avatar>
            <span className="tw:hidden tw:min-w-0 tw:flex-col tw:leading-tight tw:sm:flex">
              <span className="tw:text-[13px] tw:font-semibold tw:whitespace-nowrap tw:text-foreground">{identity.displayName}</span>
              <span className="tw:text-[11px] tw:whitespace-nowrap tw:text-muted-foreground">{getRoleDisplayLabel(roles)}</span>
            </span>
            <ChevronDown aria-hidden="true" className="tw:hidden tw:size-4 tw:shrink-0 tw:text-muted-foreground tw:sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw:w-48">
            <DropdownMenuItem render={<Link href="/admin/account" />} className="tw:min-h-11 tw:sm:min-h-8">
              <User aria-hidden="true" /> My Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout} className="tw:min-h-11 tw:sm:min-h-8">
              <LogOut aria-hidden="true" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {dialog}
    </header>
  );
}
