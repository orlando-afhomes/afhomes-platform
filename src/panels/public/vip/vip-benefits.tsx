import { CalendarClock, CalendarDays, Gift, Tag, type LucideIcon } from "lucide-react";
import { VIP_BENEFITS, VIP_PAGE } from "@/modules/public-site/content/vip";
import { Photo, Section, SectionHeading } from "../site/blocks";

/** Icons for the benefit rows, in the order of VIP_BENEFITS. */
const BENEFIT_ICONS: LucideIcon[] = [Tag, CalendarDays, CalendarClock, Gift];

export function VipBenefits() {
  const { eyebrow, title, image } = VIP_PAGE.benefits;
  return (
    <Section id="benefits" tone="soft">
      <div className="vip-benefits">
        <div className="vip-benefits__text site-home-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} />
          <ul className="vip-benefits__list">
            {VIP_BENEFITS.map((benefit, index) => {
              const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length];
              return (
                <li key={benefit.parts.map((part) => part.text).join("")} className="vip-benefits__item">
                  <span className="vip-benefits__icon" aria-hidden="true">
                    <Icon strokeWidth={1.5} />
                  </span>
                  <p className="vip-benefits__copy">
                    {benefit.parts.map((part) =>
                      part.strong ? <strong key={part.text} className="vip-benefits__strong">{part.text}</strong> : <span key={part.text}>{part.text}</span>,
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
        <Photo image={image} ratio="16 / 9" fit="contain" className="vip-benefits__photo site-home-reveal" sizes="(min-width: 900px) 480px, 100vw" />
      </div>
    </Section>
  );
}
