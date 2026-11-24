"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";

type LogoutUser = { name: string; roleLabel: string; initials: string; avatarUrl?: string | null };

/**
 * Signed-in user card shared by the desktop sidebar and the mobile drawer footer.
 * The whole card is one button that starts the log-out confirmation.
 */
export function LogoutButton({ user, onClick, collapsed = false }: { user: LogoutUser; onClick: () => void; collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Log out"
      title={`Log out ${user.name}`}
      className={cn(
        "tw:group tw:flex tw:w-full tw:min-w-0 tw:items-center tw:gap-2.5 tw:rounded-xl tw:bg-white/[0.06] tw:p-2 tw:text-left tw:transition-colors tw:hover:bg-white/15 tw:focus-visible:ring-2 tw:focus-visible:ring-white/60 tw:focus-visible:outline-none",
        collapsed && "tw:w-auto tw:justify-center tw:bg-transparent tw:p-0 tw:hover:bg-transparent",
      )}
    >
      <Avatar className="tw:size-9 tw:bg-white/15 tw:text-xs tw:text-white tw:ring-2 tw:ring-white/20">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
        <AvatarFallback className="tw:bg-white/15 tw:text-white">{user.initials}</AvatarFallback>
      </Avatar>
      {collapsed ? null : (
        <>
          <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:leading-tight">
            <span className="tw:truncate tw:text-[13px] tw:font-semibold tw:text-white">{user.name}</span>
            <span className="tw:truncate tw:text-xs tw:text-white/65">{user.roleLabel}</span>
          </span>
          <LogOut aria-hidden="true" className="tw:size-4 tw:shrink-0 tw:text-white/70 tw:group-hover:text-white" />
        </>
      )}
    </button>
  );
}
