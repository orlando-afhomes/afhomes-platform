"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/shared/ui/button";

/** Icon-only sign-out button shared by the desktop sidebar and the mobile drawer footer. */
export function LogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label="Log out" title="Log out" className="tw:size-9 tw:shrink-0 tw:text-white/70 tw:hover:bg-white/10 tw:hover:text-white">
      <LogOut aria-hidden="true" />
    </Button>
  );
}
