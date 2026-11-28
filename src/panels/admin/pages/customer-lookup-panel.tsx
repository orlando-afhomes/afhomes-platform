"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { AdminPage } from "@/shared/components/admin/admin-page";
import { CUSTOMER_LOOKUP_GRANTS } from "../navigation";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";
import { Button } from "@/shared/ui/button";
import { EnterResortBillButton, type LoyaltyHolder } from "./stay-points-page";
import { BadgeCheck, BedDouble, CalendarDays, ChevronDown, Coins, CreditCard, Crown, IdCard, Search, UserRound, type LucideIcon } from "lucide-react";
import { useCustomerLookup, useVipProducts } from "@/data/business-queries";
import { CUSTOMER_LOOKUP_MIN_LENGTH, type CustomerLookupResult } from "@/data/contracts/membership-repository";
import { SearchInput } from "@/shared/components/modern/search-input";
import { TextLinesSkeleton } from "@/shared/components/modern/skeletons";
import { formatDate } from "@/shared/lib/format-date";
import { Card } from "@/shared/ui/card";
import { PlanCardImage } from "../components/customer-plan-summary";
import { useTierDisplayName } from "../components/use-tier-display-name";

const SUGGESTION_LIMIT = 6;
const DEBOUNCE_MS = 300;
const numberFormat = new Intl.NumberFormat("en-PH");

export function CustomerLookupPage() {
  const allowed = useRoleAwareAdminNavigation().some((item) => item.id === "customer-lookup");
  return (
    <AdminPage
      anyOf={CUSTOMER_LOOKUP_GRANTS}
      allowed={allowed}
      title="Customer Search"
      crumbs={[{ label: "Customer Search" }]}
    >
      <CustomerLookupPanel />
    </AdminPage>
  );
}

/**
 * Staff Customer Search, copied from the v2 process (UI21): live search from 2 characters, up to
 * 6 suggestions, then the card. Staff only; there is no public customer or card lookup (R11).
 * shortcut: the v2 government ID side of the card is left out; v3 stores no ID images yet.
 */
export function CustomerLookupPanel() {
  const { identity } = useDevIdentity();
  return <CustomerLookupSession key={identity.id} counter={identity.roles.includes("gsd")} />;
}

function CustomerLookupSession({ counter }: { counter: boolean }) {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const lookup = useCustomerLookup(term);
  const tierName = useTierDisplayName();

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(input), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  const tooShort = term.trim().length < CUSTOMER_LOOKUP_MIN_LENGTH;
  const results = lookup.data ?? [];
  const detailsId = useId();
  const suggestions = results.slice(0, SUGGESTION_LIMIT);
  const listId = useId();
  // Once a customer is picked, the list of matches is hidden and only that customer's details show.
  const picked = suggestions.some((item) => item.membershipId === selectedId);
  const showingList = !tooShort && !picked && !lookup.isLoading && !lookup.error && suggestions.length > 0;
  const activeIndex = showingList ? Math.min(active, suggestions.length - 1) : -1;
  // Arrow keys move through the suggestions and Enter opens the highlighted customer, so search needs no mouse.
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showingList) return;
    const count = suggestions.length;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(activeIndex < 0 ? 0 : (activeIndex + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex <= 0 ? count - 1 : activeIndex - 1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      setSelectedId(suggestions[activeIndex].membershipId);
    } else if (event.key === "Escape") {
      setActive(-1);
    }
  };

  return (
    <div className="customer-lookup">
      <Card className="customer-lookup__search">
        <div className="customer-lookup__search-heading">
          <span className="customer-lookup__accent-icon"><Search aria-hidden="true" /></span>
          <div>
            <h2>Find an active VIP customer</h2>
            <p>Search by name, Customer ID, VIP Number or email.</p>
          </div>
        </div>
        <div className="customer-lookup__search-row">
          <SearchInput
            label="Find customer"
            placeholder="Name of an active VIP customer"
            value={input}
            onChange={(next) => {
              setInput(next);
              setSelectedId(null);
              setActive(-1);
            }}
            className="customer-lookup__search-field"
            inputProps={{
              onKeyDown: onSearchKeyDown,
              "aria-controls": showingList ? listId : undefined,
              "aria-activedescendant": activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined,
              "aria-autocomplete": "list",
            }}
          />
        </div>
        <div role="status" aria-live="polite" className="tw:text-sm">
          {tooShort || picked ? null : lookup.isLoading ? (
            <TextLinesSkeleton lines={2} />
          ) : lookup.error ? (
            <div role="alert" className="tw:rounded-lg tw:border tw:border-destructive/40 tw:p-3 tw:text-destructive">
              <p className="tw:font-medium">Customer Search is unavailable right now.</p>
              <p>{lookup.error instanceof Error ? lookup.error.message : "Please try again. If this continues, contact AFhomes support."}</p>
            </div>
          ) : results.length === 0 ? (
            <div>
              <p className="tw:font-medium">No active VIP customer found.</p>
              <p className="tw:text-muted-foreground">Check the name and try again.</p>
            </div>
          ) : (
            <SuggestionList
              items={suggestions}
              listId={listId}
              activeIndex={activeIndex}
              detailsId={detailsId}
              selectedId={selectedId}
              onPick={setSelectedId}
            />
          )}
        </div>
      </Card>
      {suggestions.map((item) => (
        <LookupDisclosure key={item.membershipId} open={item.membershipId === selectedId} id={`${detailsId}-${item.membershipId}`}>
          <div className="customer-lookup__selected">
            <LookupCard item={item} tierName={tierName(item.productCode) ?? item.productCode} counter={counter} />
            {!counter ? <ManualHolderActions item={item} /> : null}
          </div>
        </LookupDisclosure>
      ))}
    </div>
  );
}

function SuggestionList({
  items,
  listId,
  activeIndex,
  detailsId,
  selectedId,
  onPick,
}: {
  items: CustomerLookupResult[];
  listId: string;
  activeIndex: number;
  detailsId: string;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <ul id={listId} aria-label="Suggested customers" className="customer-lookup__suggestions">
      {items.map((item, index) => (
        <li key={item.membershipId}>
          <Button variant="ghost"
            type="button"
            id={`${listId}-${index}`}
            data-active={index === activeIndex ? "true" : undefined}
            ref={index === activeIndex ? (node) => node?.scrollIntoView?.({ block: "nearest" }) : undefined}
            aria-expanded={item.membershipId === selectedId}
            aria-controls={item.membershipId === selectedId ? `${detailsId}-${item.membershipId}` : undefined}
            onClick={() => onPick(item.membershipId)}
            className="customer-lookup__suggestion"
          >
            <span>
              <strong>{item.customerName}</strong>
              <small>VIP No. {item.vipNumber ?? "—"}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function LookupDisclosure({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  // Opening a section scrolls it into view once it has expanded, so the person sees what opened.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const element = content.current;
      if (!element) return;
      // Content taller than most of the screen starts at the top (below the header); shorter content only needs to be fully visible.
      const tall = element.getBoundingClientRect().height > window.innerHeight * 0.6;
      element.scrollIntoView?.({ block: tall ? "start" : "nearest", behavior: reduce ? "auto" : "smooth" });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open]);
  return <Collapsible.Root open={open}>
    <Collapsible.Panel id={id} className="customer-lookup__disclosure" inert={!open}>
      <div ref={content} className="customer-lookup__disclosure-content tw:scroll-mt-24">{children}</div>
    </Collapsible.Panel>
  </Collapsible.Root>;
}

/** Loyalty actions for the searched membership. Member-QR holder identification is retired (2026-11-26). */
function ManualHolderActions({ item }: { item: CustomerLookupResult }) {
  const [open, setOpen] = useState(false);
  const loyaltyId = useId();
  return <div className="customer-lookup__manual">
    <div className="customer-lookup__shortcuts">
      <Button type="button" variant="outline" className="customer-lookup__shortcut customer-lookup__shortcut--loyalty" aria-expanded={open} aria-controls={loyaltyId} onClick={() => setOpen(!open)}>
        <span>Loyalty Actions</span>
        <ChevronDown aria-hidden="true" className="tw:rotate-[-90deg]" />
      </Button>
    </div>
    <LookupDisclosure open={open} id={loyaltyId}>
      <div className="customer-lookup__loyalty-section"><LoyaltyActions membershipId={item.membershipId} holderName={item.customerName} vipNumber={item.vipNumber ?? ""} /></div>
    </LookupDisclosure>
  </div>;
}

/**
 * Only the fields the search actually returns are shown: the lookup covers active, unexpired
 * memberships but carries no financial-hold data, so no status or hold text is invented here.
 * Live redemption stays retired (2026-11-26); the bookings UI is not offered.
 */
function LoyaltyActions({ membershipId, holderName, vipNumber }: LoyaltyHolder) {
  const lookup = useCustomerLookup(vipNumber);
  const balance = lookup.data?.find((item) => item.membershipId === membershipId);
  return <Card className="customer-lookup__loyalty">
    <div className="customer-lookup__loyalty-heading">
      <span className="customer-lookup__accent-icon customer-lookup__accent-icon--member"><UserRound aria-hidden="true" /></span>
      <h2>{holderName}</h2>
    </div>
    <dl className="customer-lookup__loyalty-details">
      <div className="customer-lookup__loyalty-detail">
        <dt><IdCard aria-hidden="true" /> VIP Card No.</dt>
        <dd><strong>{vipNumber || "—"}</strong></dd>
      </div>
      <div className="customer-lookup__loyalty-detail">
        <dt><BedDouble aria-hidden="true" /> Stay Points</dt>
        <dd>{lookup.isError ? <span role="alert">Could not load Stay Points.</span> : balance ? (
          <><strong>{numberFormat.format(balance.weekdayPoints)}</strong> weekday <span aria-hidden="true">·</span> <strong>{numberFormat.format(balance.weekendPoints)}</strong> weekend</>
        ) : <span role="status">{lookup.isPending ? "Loading Stay Points…" : "Unavailable"}</span>}</dd>
      </div>
    </dl>
    <div className="customer-lookup__loyalty-buttons">
      <EnterResortBillButton selected={{ membershipId, holderName, vipNumber }} />
    </div>
  </Card>;
}

function LookupCard({ item, tierName, counter }: { item: CustomerLookupResult; tierName: string; counter: boolean }) {
  const { data: products } = useVipProducts();
  const product = products?.find((entry) => entry.code === item.productCode);
  return (
    <Card className="customer-lookup__summary" aria-label="Customer card">
      <PlanCardImage code={item.productCode} colorKey={product?.tierColorKey} className="customer-lookup__card-image" />
      <div className="customer-lookup__summary-details">
        <div className="customer-lookup__summary-heading">
          <div className="customer-lookup__summary-name">
            <h3>{item.customerName}</h3>
            <span className="customer-lookup__status" title="Active membership"><BadgeCheck aria-hidden="true" /><span className={counter ? undefined : "tw:sr-only"}>Active membership</span></span>
          </div>
          <span className="customer-lookup__tier" data-tier={product?.tierColorKey}><Crown aria-hidden="true" />{tierName}</span>
        </div>
        <dl className="customer-lookup__facts">
          <LookupFact icon={CreditCard} term="VIP Card No." value={item.vipNumber ?? "—"} />
          <LookupFact icon={CalendarDays} term="Valid Until" value={item.validUntil ? formatDate(item.validUntil) : "—"} />
          <LookupFact icon={UserRound} term="Customer ID" value={item.customerNumber ?? "—"} />
        </dl>
        {!counter ? <dl className="customer-lookup__points">
          <LookupFact icon={Coins} term="Total Points" value={numberFormat.format(item.totalPoints)} />
          <LookupFact icon={CalendarDays} term="Weekday Points" value={numberFormat.format(item.weekdayPoints)} />
          <LookupFact icon={CalendarDays} term="Weekend Points" value={numberFormat.format(item.weekendPoints)} />
        </dl> : null}
      </div>
    </Card>
  );
}

function LookupFact({ icon: Icon, term, value }: { icon: LucideIcon; term: string; value: string }) {
  return <div className="customer-lookup__fact">
    <dt><span className="customer-lookup__fact-icon"><Icon aria-hidden="true" /></span>{term}</dt>
    <dd>{value}</dd>
  </div>;
}
