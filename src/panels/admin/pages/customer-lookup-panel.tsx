"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MemberQrHolder } from "@/data/contracts/member-qr-repository";
import { useMockRepositories } from "@/data/queries";
import { usePromoBalances } from "@/data/promo-queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { AdminPage } from "@/shared/components/admin/admin-page";
import { CUSTOMER_LOOKUP_GRANTS } from "../navigation";
import { useRoleAwareAdminNavigation } from "../use-role-aware-navigation";
import { Button } from "@/shared/ui/button";
import { MemberQrButton, ScanMemberQrButton } from "../components/member-qr";
import { EnterResortBillButton } from "./stay-points-page";
import { RecordPromoUseButton } from "./promo-points-page";
import { RedemptionBookingsPanel } from "./redemption-page";
import { BadgeCheck, BedDouble, CalendarDays, ChevronDown, ChevronRight, Coins, CreditCard, Crown, Gift, IdCard, Info, Layers3, Search, UserRound, type LucideIcon } from "lucide-react";
import { useCustomerLookup, useOperation, useVipProducts } from "@/data/business-queries";
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
      title="Customer Look Up"
      crumbs={[{ label: "Customer Look Up" }]}
    >
      <CustomerLookupPanel />
    </AdminPage>
  );
}

/**
 * Staff Customer Look Up, copied from the v2 process (UI21): live search from 2 characters, up to
 * 6 suggestions, then the card. Staff only; there is no public customer or card lookup (R11).
 * shortcut: the v2 government ID side of the card is left out; v3 stores no ID images yet.
 */
export function CustomerLookupPanel() {
  const { identity } = useDevIdentity();
  return <CustomerLookupSession key={identity.id} />;
}

function CustomerLookupSession() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanned, setScanned] = useState<MemberQrHolder | null>(null);
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
              setScanned(null);
            }}
            className="customer-lookup__search-field"
          />
          <div className="customer-lookup__scan"><ScanMemberQrButton onSelect={(holder) => { setSelectedId(null); setInput(""); setScanned(holder); }} /></div>
        </div>
        <div role="status" aria-live="polite" className="tw:text-sm">
          {tooShort || scanned ? null : lookup.isLoading ? (
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
              items={suggestions}
              detailsId={detailsId}
              selectedId={selectedId}
              tierName={tierName}
              onPick={(id) => setSelectedId((current) => current === id ? null : id)}
            />
          )}
        </div>
      </Card>
      {!scanned ? suggestions.map((item) => (
        <LookupDisclosure key={item.membershipId} open={item.membershipId === selectedId} id={`${detailsId}-${item.membershipId}`}>
          <div className="customer-lookup__selected">
            <LookupCard item={item} tierName={tierName(item.productCode) ?? item.productCode} />
            <ManualHolderActions membershipId={item.membershipId} />
          </div>
        </LookupDisclosure>
      )) : <div className="customer-lookup__selected"><LoyaltyActions key={scanned.membershipId + scanned.holder} holder={scanned} /></div>}
    </div>
  );
}

function SuggestionList({
  items,
  detailsId,
  selectedId,
  tierName,
  onPick,
}: {
  items: CustomerLookupResult[];
  detailsId: string;
  selectedId: string | null;
  tierName: (code: CustomerLookupResult["productCode"]) => string | null;
  onPick: (id: string) => void;
}) {
  return (
    <ul aria-label="Suggested customers" className="customer-lookup__suggestions">
      {items.map((item) => (
        <li key={item.membershipId}>
          <Button variant="ghost"
            type="button"
            aria-expanded={item.membershipId === selectedId}
            aria-controls={item.membershipId === selectedId ? `${detailsId}-${item.membershipId}` : undefined}
            onClick={() => onPick(item.membershipId)}
            className="customer-lookup__suggestion"
          >
            <span>
              <strong>{item.customerName}</strong>
              <small>{tierName(item.productCode) ?? item.productCode} · Valid until {item.validUntil ? formatDate(item.validUntil) : "—"}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function LookupDisclosure({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return <Collapsible.Root open={open}>
    <Collapsible.Panel id={id} className="customer-lookup__disclosure" inert={!open}>
      <div className="customer-lookup__disclosure-content">{children}</div>
    </Collapsible.Panel>
  </Collapsible.Root>;
}

function ManualHolderActions({ membershipId }: { membershipId: string }) {
  const { memberQr } = useMockRepositories();
  const { identity } = useDevIdentity();
  const [role, setRole] = useState<MemberQrHolder["holder"]>();
  const holders = useQuery({
    queryKey: ["lookup-cardholders", identity.id, membershipId],
    queryFn: () => memberQr.identify(membershipId),
  });
  const loyaltyId = useId();
  const cardholders = holders.data ?? [];
  const hasMultipleHolders = cardholders.length > 1;
  return <div className="customer-lookup__manual">
    <div className="customer-lookup__shortcuts">
      <MemberQrButton membershipId={membershipId} lookupShortcut />
      {cardholders.map((holder) => <Button key={holder.holder} type="button" variant="outline" className="customer-lookup__shortcut customer-lookup__shortcut--loyalty" aria-description={hasMultipleHolders ? holder.holderName : undefined} aria-expanded={holder.holder === role} aria-controls={holder.holder === role ? `${loyaltyId}-${holder.holder}` : undefined} onClick={() => setRole(holder.holder === role ? undefined : holder.holder)}>
        <Layers3 aria-hidden="true" />
        <span>{hasMultipleHolders ? (holder.holder === "primary" ? "Primary Loyalty" : "Supplementary Loyalty") : "Loyalty Actions"}</span>
        <ChevronRight aria-hidden="true" />
      </Button>)}
    </div>
    {holders.isError ? <p role="alert">{holders.error.message}</p> : null}
    {cardholders.map((holder) => (
      <LookupDisclosure key={holder.holder} open={holder.holder === role} id={`${loyaltyId}-${holder.holder}`}>
        <div className="customer-lookup__loyalty-section"><LoyaltyActions holder={holder} /></div>
      </LookupDisclosure>
    ))}
  </div>;
}

function LoyaltyActions({ holder }: { holder: MemberQrHolder }) {
  const lookup = useCustomerLookup(holder.vipNumber);
  const balance = lookup.data?.find((item) => item.membershipId === holder.membershipId);
  const canBook = useOperation("redemption.book");
  const [bookings, setBookings] = useState(false);
  const [create, setCreate] = useState(false);
  return <Card className="customer-lookup__loyalty">
    <div className="customer-lookup__loyalty-heading">
      <span className="customer-lookup__accent-icon"><Info aria-hidden="true" /></span>
      <h2>{holder.holderName}</h2>
    </div>
    <dl className="customer-lookup__loyalty-details">
      <div className="customer-lookup__loyalty-detail">
        <dt><IdCard aria-hidden="true" /> VIP Card No.</dt>
        <dd><strong>{holder.vipNumber}</strong><small className="customer-lookup__loyalty-membership">{holder.status}{holder.financialHold ? " · Financial hold" : ""}</small></dd>
      </div>
      <div className="customer-lookup__loyalty-detail">
        <dt><BedDouble aria-hidden="true" /> Stay Points</dt>
        <dd>{lookup.isError ? <span role="alert">Could not load Stay Points.</span> : balance ? (
          <><strong>{numberFormat.format(balance.weekdayPoints)}</strong> weekday <span aria-hidden="true">·</span> <strong>{numberFormat.format(balance.weekendPoints)}</strong> weekend</>
        ) : <span role="status">{lookup.isPending ? "Loading Stay Points…" : "Unavailable"}</span>}</dd>
      </div>
      <ScannedPromoBalance membershipId={holder.membershipId} />
    </dl>
    <div className="customer-lookup__loyalty-buttons">
      <EnterResortBillButton selected={holder} />
      <RecordPromoUseButton selected={holder} />
      {canBook ? <Button type="button" variant="outline" className="customer-lookup__manage-bookings" aria-expanded={bookings} onClick={() => setBookings(!bookings)}><BedDouble aria-hidden="true" />{bookings ? "Hide Stay Bookings" : "Manage Stay Bookings"}</Button> : null}
    </div>
    {canBook && bookings ? (
      <section className="customer-lookup__bookings" aria-label="Stay bookings">
        <div className="customer-lookup__bookings-heading">
          <h3>Stay Bookings</h3>
          <Button type="button" onClick={() => setCreate(true)}>New Booking</Button>
        </div>
        <RedemptionBookingsPanel selected={holder} createOpen={create} onCreateClose={() => setCreate(false)} />
      </section>
    ) : null}
  </Card>;
}

function ScannedPromoBalance({ membershipId }: { membershipId: string }) {
  const balances = usePromoBalances();
  const balance = balances.data?.find((item) => item.membershipId === membershipId);
  return (
    <div className="customer-lookup__loyalty-detail">
      <dt><Gift aria-hidden="true" /> Promo Points</dt>
      <dd>{balances.isError ? <span role="alert">Could not load Promo Points.</span> : balances.isPending ? (
        <span role="status">Loading Promo Points…</span>
      ) : <><strong>{numberFormat.format(balance?.total.available ?? 0)}</strong> available</>}</dd>
    </div>
  );
}

function LookupCard({ item, tierName }: { item: CustomerLookupResult; tierName: string }) {
  const { data: products } = useVipProducts();
  const product = products?.find((entry) => entry.code === item.productCode);
  return (
    <Card className="customer-lookup__summary" aria-label="Customer card">
      <PlanCardImage code={item.productCode} colorKey={product?.tierColorKey} className="customer-lookup__card-image" />
      <div className="customer-lookup__summary-details">
        <div className="customer-lookup__summary-heading">
          <div className="customer-lookup__summary-name">
            <h3>{item.customerName}</h3>
            <span className="customer-lookup__status" title="Active membership"><BadgeCheck aria-hidden="true" /><span className="tw:sr-only">Active membership</span></span>
          </div>
          <span className="customer-lookup__tier" data-tier={product?.tierColorKey}><Crown aria-hidden="true" />{tierName}</span>
        </div>
        <dl className="customer-lookup__facts">
          <LookupFact icon={CreditCard} term="VIP Card No." value={item.vipNumber ?? "—"} />
          <LookupFact icon={CalendarDays} term="Valid Until" value={item.validUntil ? formatDate(item.validUntil) : "—"} />
          <LookupFact icon={UserRound} term="Customer ID" value={item.customerNumber ?? "—"} />
        </dl>
        <dl className="customer-lookup__points">
          <LookupFact icon={Coins} term="Total Points" value={numberFormat.format(item.totalPoints)} />
          <LookupFact icon={CalendarDays} term="Weekday Points" value={numberFormat.format(item.weekdayPoints)} />
          <LookupFact icon={CalendarDays} term="Weekend Points" value={numberFormat.format(item.weekendPoints)} />
        </dl>
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
