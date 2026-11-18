"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/shared/components/modern/empty-state";
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

/** One answer whose height animates from 0 to its content height and back. */
function FaqDisclosure({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  const clipRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const el = clipRef.current;
    if (!el) return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof el.animate !== "function") {
      animationRef.current?.cancel();
      el.style.height = open ? "auto" : "0px";
      return;
    }

    const start = el.getBoundingClientRect().height;
    animationRef.current?.cancel();
    if (open) {
      el.style.height = "auto";
      const end = el.scrollHeight;
      el.style.height = `${start}px`;
      const animation = el.animate(
        [{ height: `${start}px` }, { height: `${end}px` }],
        { duration: 320, easing: "cubic-bezier(0.22, 0.8, 0.2, 1)" },
      );
      animationRef.current = animation;
      animation.onfinish = () => { el.style.height = "auto"; };
    } else {
      el.style.height = `${start}px`;
      const animation = el.animate(
        [{ height: `${start}px` }, { height: "0px" }],
        { duration: 320, easing: "cubic-bezier(0.22, 0.8, 0.2, 1)" },
      );
      animationRef.current = animation;
      animation.onfinish = () => { el.style.height = "0px"; };
    }
  }, [open]);

  useEffect(() => () => animationRef.current?.cancel(), []);

  return (
    <div id={id} className="faq-questions__answer-wrap" aria-hidden={!open}>
      <div ref={clipRef} className="faq-questions__answer-clip">
        {children}
      </div>
    </div>
  );
}

/** Questions as accessible disclosure buttons; answers animate open and closed. */
export function FaqQuestions({ query }: { query: string }) {
  const { eyebrow, title, text, empty } = FAQ_PAGE.questions;
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const needle = query.trim().toLowerCase();
  const items = useMemo(
    () => (needle ? SEARCH_INDEX.filter((entry) => entry.text.includes(needle)).map((entry) => entry.item) : FAQ_ITEMS),
    [needle],
  );

  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Open the question named in the address hash (quick-help chips and links like /faq#payment).
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !FAQ_ITEMS.some((item) => item.id === id)) return;
      setOpenIds((current) => {
        if (current.has(id)) return current;
        const next = new Set(current);
        next.add(id);
        return next;
      });
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const status = needle ? (items.length === 1 ? "1 question found" : `${items.length} questions found`) : "";

  return (
    <Section className="faq-questions">
      <SectionHeading eyebrow={eyebrow} title={title} text={text} />
      <p className="faq-questions__status" role="status" aria-live="polite">{status}</p>
      <div className="faq-questions__list-wrap site-home-reveal">
        {items.length ? (
          items.map((item) => {
            // While searching, keep every matching answer open so the result is visible at once.
            const isOpen = Boolean(needle) || openIds.has(item.id);
            return (
              <div key={item.id} className="faq-questions__item" id={item.id} data-open={isOpen ? "" : undefined}>
                <button
                  type="button"
                  id={`${item.id}-summary`}
                  className="faq-questions__summary"
                  aria-expanded={isOpen}
                  aria-controls={`${item.id}-answer`}
                  onClick={() => toggle(item.id)}
                >
                  <span>{item.question}</span>
                  <ChevronDown aria-hidden="true" className="faq-questions__chevron" />
                </button>
                <FaqDisclosure id={`${item.id}-answer`} open={isOpen}>
                  <div className="faq-questions__answer">
                    <Blocks blocks={item.blocks} />
                  </div>
                </FaqDisclosure>
              </div>
            );
          })
        ) : (
          <EmptyState icon={<Search aria-hidden="true" />} title="No questions found" text={empty} />
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
