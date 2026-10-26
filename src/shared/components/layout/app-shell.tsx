import type { ReactNode } from "react";

export function AppShell({
  sidebar,
  header,
  children,
}: {
  sidebar?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
