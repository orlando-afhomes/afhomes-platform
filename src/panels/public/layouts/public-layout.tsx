import { PublicFooter } from "../components/public-footer";
import { PublicHeader } from "../components/public-header";
import "../site.css";
import "@/shared/components/site/site-chrome.css";
import "@/shared/components/site/site-components.css";

export function PublicLayout({
  children,
  headerVariant = "transparent",
  trackActive = true,
}: {
  children: React.ReactNode;
  headerVariant?: "transparent" | "solid";
  trackActive?: boolean;
}) {
  return (
    <div className="public-layout">
      <a href="#main-content" className="site-skip-link">Skip to content</a>
      <PublicHeader variant={headerVariant} trackActive={trackActive} />
      <main id="main-content" className="public-layout__main">{children}</main>
      <PublicFooter />
    </div>
  );
}
