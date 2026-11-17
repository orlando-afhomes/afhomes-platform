import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type SiteCalloutProps = {
  /** A React element (for example a Lucide icon), so it can cross from server to client components. */
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  cta: string;
  className?: string;
};

/** Dark, wide panel with one icon, a short message and a single action. */
export function SiteCallout({ icon, title, text, href, cta, className }: SiteCalloutProps) {
  return (
    <div className={cn("site-callout", className)}>
      <span className="site-callout__icon" aria-hidden="true">{icon}</span>
      <div className="site-callout__copy">
        <h3 className="site-callout__title">{title}</h3>
        <p className="site-callout__text">{text}</p>
      </div>
      <Link href={href} className="site-callout__action">
        {cta}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
