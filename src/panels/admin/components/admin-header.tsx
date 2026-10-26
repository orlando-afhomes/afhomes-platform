import { AdminMobileNav } from "./admin-mobile-nav";

export function AdminHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <AdminMobileNav />
          <h1 className="text-sm font-semibold">Administration</h1>
        </div>
      </div>
    </header>
  );
}
