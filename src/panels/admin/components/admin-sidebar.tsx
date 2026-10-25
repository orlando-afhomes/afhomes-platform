const items = [
  { label: "Dashboard", href: "/admin" },
  { label: "Roles & Permissions", href: "/admin/roles" },
  { label: "Customers", href: "/admin/customers" },
  { label: "VIP Products", href: "/admin/vip-products" },
  { label: "Finance", href: "/admin/finance" },
  { label: "Audit Logs", href: "/admin/audit-logs" },
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:block">
      <div className="px-4 py-4 text-sm font-semibold">AFhomes Admin</div>
      <nav className="flex flex-col gap-1 px-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}