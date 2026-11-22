"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Menu as MenuIcon, User } from "lucide-react";
import { AdminBrand } from "./admin-brand";
import { AdminMobileNav } from "./admin-mobile-nav";
import { NotificationsMenu } from "./notifications-menu";
import { useLogout } from "../use-logout";
import { useAdminUser } from "../use-admin-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

/** "Good morning" / "Good afternoon" / "Good evening" by the hour in Manila (business time zone). */
function greetingFor(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(now)) % 24;
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

const dateText = (now: Date) => new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(now);

export function AdminHeader({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
}) {
  const user = useAdminUser();
  const { logout, dialog } = useLogout();
  const now = new Date();
  // The "(Dev)" suffix marks the mock identity; the greeting reads better without it.
  const shortName = user.name.replace(/\s*\(Dev\)$/, "");

  return (
    <header className="tw:sticky tw:top-0 tw:z-20 tw:flex tw:h-16 tw:shrink-0 tw:items-center tw:gap-2 tw:border-b tw:border-border tw:bg-background/80 tw:px-4 tw:shadow-[0_1px_8px_rgba(14,43,32,0.04)] tw:backdrop-blur-md">
      <span aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:inset-x-0 tw:top-0 tw:h-0.5 tw:bg-(image:--gradient-brand-logo) tw:opacity-80" />
      <Link href="/admin" aria-label="AFHomes dashboard" className="tw:rounded-lg tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:md:hidden">
        <AdminBrand tone="light" iconOnly className="tw:sm:hidden" />
        <AdminBrand tone="light" className="tw:hidden tw:sm:inline-flex" />
      </Link>
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
      <p className="tw:hidden tw:min-w-0 tw:flex-col tw:leading-tight tw:md:flex">
        <span className="tw:truncate tw:text-sm tw:font-semibold tw:text-foreground">{greetingFor(now)}, {shortName}</span>
        <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{dateText(now)}</span>
      </p>
      <div className="tw:ml-auto tw:flex tw:items-center tw:gap-1">
        <NotificationsMenu />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              // Raw button exception: composite avatar+name+chevron trigger; the
              // Button primitive cannot render this composite trigger content.
              <button
                type="button"
                aria-label={`Account options for ${user.name}`}
                className="tw:inline-flex tw:size-11 tw:items-center tw:justify-center tw:gap-2.5 tw:rounded-full tw:text-left tw:transition-colors tw:hover:bg-muted tw:md:h-11 tw:md:w-auto tw:md:justify-start tw:md:border tw:md:border-border tw:md:bg-card tw:md:py-1 tw:md:pr-3 tw:md:pl-1 tw:md:shadow-xs tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:motion-reduce:transition-none"
              />
            }
          >
            <Avatar className="tw:size-9 tw:bg-primary tw:text-xs tw:text-primary-foreground">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback className="tw:bg-primary tw:text-primary-foreground">{user.initials}</AvatarFallback>
            </Avatar>
            <span className="tw:hidden tw:min-w-0 tw:flex-col tw:leading-tight tw:md:flex">
              <span className="tw:text-[13px] tw:font-semibold tw:whitespace-nowrap tw:text-foreground">{user.name}</span>
              <span className="tw:text-xs tw:whitespace-nowrap tw:text-muted-foreground">{user.roleLabel}</span>
            </span>
            <ChevronDown aria-hidden="true" className="tw:hidden tw:size-4 tw:shrink-0 tw:text-muted-foreground tw:md:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw:w-48">
            <DropdownMenuItem render={<Link href="/admin/account" />} className="tw:min-h-11 tw:sm:min-h-8">
              <User aria-hidden="true" /> My Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout} className="tw:min-h-11 tw:sm:min-h-8">
              <LogOut aria-hidden="true" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Phones and tablets: the menu button sits at the right edge, where a right-handed thumb rests. */}
        <AdminMobileNav />
      </div>
      {dialog}
    </header>
  );
}
