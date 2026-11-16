"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { useCustomerLookup, useVipProducts } from "@/data/business-queries";
import { CUSTOMER_LOOKUP_MIN_LENGTH, type CustomerLookupResult } from "@/data/contracts/membership-repository";
import { SearchInput } from "@/shared/components/modern/search-input";
import { TextLinesSkeleton } from "@/shared/components/modern/skeletons";
import { formatDate } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { PlanCardImage } from "../components/customer-plan-summary";
import { useTierDisplayName } from "../components/use-tier-display-name";

const SUGGESTION_LIMIT = 6;
const DEBOUNCE_MS = 300;
const numberFormat = new Intl.NumberFormat("en-PH");

/**
 * Staff Customer Look Up, copied from the v2 process (UI21): live search from 2 characters, up to
 * 6 suggestions, then the card. Staff only; there is no public customer or card lookup (R11).
 * shortcut: the v2 government ID side of the card is left out; v3 stores no ID images yet.
 */
export function CustomerLookupPanel() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lookup = useCustomerLookup(term);
  const tierName = useTierDisplayName();

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(input), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  const tooShort = term.trim().length < CUSTOMER_LOOKUP_MIN_LENGTH;
  const results = lookup.data ?? [];
  const selected = results.find((item) => item.membershipId === selectedId) ?? null;

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <Card className="tw:flex tw:flex-col tw:gap-3 tw:p-4">
        <div>
          <h2 className="tw:text-base tw:font-semibold">Find an active VIP customer</h2>
          <p className="tw:text-sm tw:text-muted-foreground">Search by name, Customer ID, VIP Number or email.</p>
        </div>
        <SearchInput
          label="Find customer"
          placeholder="Name of an active VIP customer"
          value={input}
          onChange={(next) => {
            setInput(next);
            setSelectedId(null);
          }}
          className="tw:sm:max-w-md"
        />
        <div role="status" aria-live="polite" className="tw:text-sm">
          {tooShort ? (
            <p className="tw:text-muted-foreground">Enter at least two characters to find an active VIP customer.</p>
          ) : lookup.isLoading ? (
            <TextLinesSkeleton lines={2} />
          ) : lookup.error ? (
            <div role="alert" className="tw:rounded-lg tw:border tw:border-destructive/40 tw:p-3 tw:text-destructive">
              <p className="tw:font-medium">Customer Look Up is unavailable right now.</p>
              <p>{lookup.error instanceof Error ? lookup.error.message : "Please try again. If this continues, contact AFhomes support."}</p>
            </div>
          ) : results.length === 0 ? (
            <div>
              <p className="tw:font-medium">No active VIP customer found.</p>
              <p className="tw:text-muted-foreground">Check the name and try again.</p>
            </div>
          ) : (
            <SuggestionList
              items={results.slice(0, SUGGESTION_LIMIT)}
              selectedId={selectedId}
              tierName={tierName}
              onPick={setSelectedId}
            />
          )}
        </div>
        {!tooShort && results.length > 0 && !selected ? (
          <p className="tw:text-sm tw:text-muted-foreground">Select a suggested name to view the record.</p>
        ) : null}
      </Card>
      {selected ? <LookupCard item={selected} tierName={tierName(selected.productCode) ?? selected.productCode} /> : null}
    </div>
  );
}

function SuggestionList({
  items,
  selectedId,
  tierName,
  onPick,
}: {
  items: CustomerLookupResult[];
  selectedId: string | null;
  tierName: (code: CustomerLookupResult["productCode"]) => string | null;
  onPick: (id: string) => void;
}) {
  return (
    <ul aria-label="Suggested customers" className="tw:flex tw:flex-col tw:divide-y tw:rounded-lg tw:border">
      {items.map((item) => (
        <li key={item.membershipId}>
          <button
            type="button"
            aria-pressed={item.membershipId === selectedId}
            onClick={() => onPick(item.membershipId)}
            className="tw:flex tw:min-h-11 tw:w-full tw:flex-col tw:items-start tw:gap-0.5 tw:px-3 tw:py-2 tw:text-left tw:hover:bg-muted tw:focus-visible:outline-2 tw:focus-visible:outline-ring tw:aria-pressed:bg-muted"
          >
            <span className="tw:font-medium">{item.customerName}</span>
            <span className="tw:text-xs tw:text-muted-foreground">
              {tierName(item.productCode) ?? item.productCode} · Valid until {item.validUntil ? formatDate(item.validUntil) : "—"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function LookupCard({ item, tierName }: { item: CustomerLookupResult; tierName: string }) {
  const { data: products } = useVipProducts();
  const product = products?.find((entry) => entry.code === item.productCode);
  return (
    <Card className="tw:grid tw:gap-4 tw:p-4 tw:md:grid-cols-[minmax(0,20rem)_1fr]" aria-label="Customer card">
      <PlanCardImage code={item.productCode} colorKey={product?.tierColorKey} className="tw:w-full tw:max-w-sm tw:rounded-xl" />
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-3">
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <h3 className="tw:text-lg tw:font-semibold tw:break-words">{item.customerName}</h3>
          <BadgeCheck aria-label="Active VIP" className="tw:size-5 tw:text-[var(--color-success-strong)]" />
          <Badge variant="secondary">{tierName}</Badge>
        </div>
        <dl className="tw:grid tw:grid-cols-2 tw:gap-3 tw:text-sm">
          <LookupFact term="VIP Card No." value={item.vipNumber ?? "—"} mono />
          <LookupFact term="Valid Until" value={item.validUntil ? formatDate(item.validUntil) : "—"} />
          <LookupFact term="Total Points" value={numberFormat.format(item.totalPoints)} />
          <LookupFact term="Customer ID" value={item.customerNumber ?? "—"} />
          <LookupFact term="Weekday Points" value={numberFormat.format(item.weekdayPoints)} />
          <LookupFact term="Weekend Points" value={numberFormat.format(item.weekendPoints)} />
        </dl>
      </div>
    </Card>
  );
}

function LookupFact({ term, value, mono = false }: { term: string; value: string; mono?: boolean }) {
  return (
    <div className="tw:min-w-0">
      <dt className="tw:text-xs tw:text-muted-foreground">{term}</dt>
      <dd className={mono ? "tw:font-mono tw:font-semibold tw:break-all" : "tw:font-semibold"}>{value}</dd>
    </div>
  );
}
