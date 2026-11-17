"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { FAQ_ITEMS, FAQ_PAGE, type FaqBlock, type FaqItem } from "@/modules/public-site/content/faq";
import { PAYMENT_DISCLAIMER } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { Section, SectionHeading } from "../site/blocks";

function Blocks({ blocks }: { blocks: FaqBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "p") return <p key={index} className="faq-questions__p">{block.text}</p>;
        if (block.type === "list") return <ul key={index} className="faq-questions__list">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        if (block.type === "terms") {
          return (
            <dl key={index} className="faq-questions__terms">
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
          <div key={index} className="faq-questions__banks">
            <p className="faq-questions__banks-title">Official company bank accounts</p>
            <p className="faq-questions__p">Account name: {PUBLIC_SUPPORT_INFO.bankAccountName}</p>
            <ul className="faq-questions__bank-list">
              {PUBLIC_SUPPORT_INFO.bankAccounts.map((account) => (
                <li key={account.accountNumber}>
                  <span className="faq-questions__bank-name">{account.bankName}</span>
                  <span className="faq-questions__bank-number">Account no. {account.accountNumber}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

/** All searchable text of one question, lower-cased once. */
function itemText(item: FaqItem): string {
  const parts: string[] = [item.question];
  for (const block of item.blocks) {
    if (block.type === "p") parts.push(block.text);
    else if (block.type === "list") parts.push(...block.items);
    else if (block.type === "terms") for (const term of block.items) parts.push(term.term, term.text);
  }
  return parts.join(" ").toLowerCase();
}

const SEARCH_INDEX = FAQ_ITEMS.map((item) => ({ item, text: itemText(item) }));

/** Opens the question named in the address hash (quick-help chips and links like /faq#payment). */
function openHashTarget() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
}

/** Questions as native disclosure boxes: keyboard and screen reader friendly with no extra script. */
export function FaqQuestions({ query }: { query: string }) {
  const { eyebrow, title, text, empty } = FAQ_PAGE.questions;
  const listRef = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const items = needle ? SEARCH_INDEX.filter((entry) => entry.text.includes(needle)).map((entry) => entry.item) : FAQ_ITEMS;

  useEffect(() => {
    openHashTarget();
    window.addEventListener("hashchange", openHashTarget);
    return () => window.removeEventListener("hashchange", openHashTarget);
  }, []);

  // While searching, open the matching questions so the answers show at once.
  useEffect(() => {
    if (!needle || !listRef.current) return;
    listRef.current.querySelectorAll("details").forEach((details) => { details.open = true; });
  }, [needle]);

  const status = needle ? (items.length === 1 ? "1 question found" : `${items.length} questions found`) : "";

  return (
    <Section className="faq-questions">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <p className="faq-questions__status" role="status" aria-live="polite">{status}</p>
      <div ref={listRef} className="faq-questions__list-wrap site-home-reveal">
        {items.length ? (
          items.map((item) => (
            <details key={item.id} className="faq-questions__item" id={item.id}>
              <summary className="faq-questions__summary">
                <span>{item.question}</span>
                <ChevronDown aria-hidden="true" className="faq-questions__chevron" />
              </summary>
              <div className="faq-questions__answer">
                <Blocks blocks={item.blocks} />
              </div>
            </details>
          ))
        ) : (
          <p className="faq-questions__empty">{empty}</p>
        )}
      </div>
      <aside id="payment-notice" className="faq-payment site-home-reveal" aria-label="Payment notice">
        <span className="faq-payment__badge" aria-hidden="true">
          <ShieldCheck className="faq-payment__icon" />
        </span>
        <span className="faq-payment__divider" aria-hidden="true" />
        <p className="faq-payment__text">{PAYMENT_DISCLAIMER}</p>
      </aside>
    </Section>
  );
}
