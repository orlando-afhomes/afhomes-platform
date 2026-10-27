import { PublicFooter } from "../components/public-footer";
import { PublicHeader } from "../components/public-header";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-layout__main">{children}</main>
      <PublicFooter />
    </div>
  );
}
