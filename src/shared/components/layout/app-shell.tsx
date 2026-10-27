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
    <div className="app-shell">
      {sidebar}
      <div className="app-shell__main">
        {header}
        <main id="main-content" className="app-shell__content">
          {children}
        </main>
      </div>
    </div>
  );
}
