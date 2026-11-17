import { VIP_PAGE } from "@/modules/public-site/content/vip";
import { DISCLAIMER, PAYMENT_DISCLAIMER } from "@/modules/public-site/content/site";
import { Section, SectionHeading } from "../site/blocks";

const ITEMS = [DISCLAIMER, PAYMENT_DISCLAIMER];

export function VipDisclaimer() {
  const { eyebrow, title } = VIP_PAGE.disclaimer;
  return (
    <Section>
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="vip-disclaimer site-home-reveal">
        <ol className="vip-disclaimer__list">
          {ITEMS.map((text, index) => (
            <li key={text} className="vip-disclaimer__item">
              <span className="vip-disclaimer__number" aria-hidden="true">{index + 1}</span>
              <p className="vip-disclaimer__text">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
