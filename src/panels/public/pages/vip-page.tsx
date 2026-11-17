import { VipHero } from "../vip/vip-hero";
import { VipCards } from "../vip/vip-cards";
import { VipBenefits } from "../vip/vip-benefits";
import { VipDisclaimer } from "../vip/vip-disclaimer";
import { VipClosing } from "../vip/vip-closing";
import "../vip/vip-hero.css";
import "../vip/vip-cards.css";
import "../vip/vip-benefits.css";
import "../vip/vip-closing.css";

/**
 * VIP Privilege page, laid out from the owner's VIP reference design.
 * The wrapper reuses the Home page styling (`site-home`: floating header, serif headings, eyebrow lines, reveal);
 * `site-vip` marks this page for its own tweaks and the header's "VIP Privilege" underline.
 */
export function VipPage() {
  return (
    <div className="site-home site-vip">
      <VipHero />
      <VipCards />
      <VipBenefits />
      <VipDisclaimer />
      <VipClosing />
    </div>
  );
}
