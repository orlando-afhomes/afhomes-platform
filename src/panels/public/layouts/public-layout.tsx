import { PublicFooter } from "../components/public-footer";
import { PublicHeader } from "../components/public-header";
import "../site.css";
import "@/shared/components/site/site-chrome.css";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-layout">
      <a href="#main-content" className="site-skip-link">Skip to content</a>
      <PublicHeader />
      <main id="main-content" className="public-layout__main">{children}</main>
      <PublicFooter />
    </div>
  );
}
