import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { FAQ_HELP, FAQ_PAGE } from "@/modules/public-site/content/faq";
import { OFFICES, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { Section, SectionHeading } from "../site/blocks";

/** One contact card: icon tile, title and content, decorative arrow badge. */
function HelpCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="faq-help__card">
      <span className="faq-help__icon" aria-hidden="true"><Icon /></span>
      <div className="faq-help__body">
        <h3 className="faq-help__title">{title}</h3>
        {children}
      </div>
      <span className="faq-help__arrow" aria-hidden="true"><ArrowRight /></span>
    </li>
  );
}

/** "Still curious?" contact section of the FAQ page, from the same sources as the Contact page cards. */
export function FaqHelp() {
  const info = PUBLIC_SUPPORT_INFO;
  return (
    <Section tone="soft" className="faq-help">
      <SectionHeading eyebrow={FAQ_PAGE.help.eyebrow} title={FAQ_HELP.title} text={FAQ_HELP.text} />
      <ul className="faq-help__grid site-home-reveal">
        <HelpCard icon={Mail} title="Email">
          <a href={`mailto:${info.email}`} className="faq-help__link">{info.email}</a>
          <Link href="/contact" className="faq-help__sublink">Use the contact form</Link>
        </HelpCard>
        <HelpCard icon={Phone} title="Phone">
          <a href={info.phoneHref} className="faq-help__link">{info.phone}</a>
          <a href={SITE.facebookUrl} className="faq-help__sublink" target="_blank" rel="noopener noreferrer">Send us a message on Facebook</a>
        </HelpCard>
        {OFFICES.map((office) => (
          <HelpCard key={office.id} icon={office.id === "head" ? Building2 : MapPin} title={office.label}>
            <p className="faq-help__text">{office.name}</p>
            <p className="faq-help__text">{office.lines.join(", ")}</p>
            {office.landmark ? <p className="faq-help__text faq-help__landmark">{office.landmark}</p> : null}
          </HelpCard>
        ))}
      </ul>
    </Section>
  );
}
