import { ChevronDown } from "lucide-react";
import type { FaqBlock, FaqItem } from "@/modules/public-site/content/faq";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";

function Blocks({ blocks }: { blocks: FaqBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "p") return <p key={index} className="site-faq__p">{block.text}</p>;
        if (block.type === "list") return <ul key={index} className="site-faq__list">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        if (block.type === "terms") {
          return (
            <dl key={index} className="site-faq__terms">
              {block.items.map((item) => (
                <div key={item.term}>
                  <dt>{item.term}</dt>
                  <dd>{item.text}</dd>
                </div>
              ))}
            </dl>
          );
        }
        return (
          <div key={index} className="site-faq__banks">
            <p className="site-faq__banks-title">Official company bank accounts</p>
            <p className="site-faq__p">Account name: {PUBLIC_SUPPORT_INFO.bankAccountName}</p>
            <ul className="site-faq__bank-list">
              {PUBLIC_SUPPORT_INFO.bankAccounts.map((account) => (
                <li key={account.accountNumber}>
                  <span className="site-faq__bank-name">{account.bankName}</span>
                  <span className="site-faq__bank-number">Account no. {account.accountNumber}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

/** Questions as native disclosure boxes: keyboard and screen reader friendly with no script. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="site-faq">
      {items.map((item) => (
        <details key={item.id} className="site-faq__item" id={item.id}>
          <summary className="site-faq__summary">
            <span>{item.question}</span>
            <ChevronDown aria-hidden="true" className="site-faq__chevron" />
          </summary>
          <div className="site-faq__answer">
            <Blocks blocks={item.blocks} />
          </div>
        </details>
      ))}
    </div>
  );
}
