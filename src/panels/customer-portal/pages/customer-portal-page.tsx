"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Pencil, ShieldCheck } from "lucide-react";
import { useCustomerPortal } from "@/shared/providers/customer-portal-provider";
import { useCustomerPortalOverview, useUpdatePortalContact } from "@/data/customer-portal-queries";
import type { PortalActivity, PortalContactInput, PortalOverview } from "@/modules/customer-portal/types";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { CustomerQr } from "../components/customer-qr";
import "../customer-portal.css";

const points = (value: number) => value.toLocaleString("en-PH");

function PortalBrand() {
  return <p className="customer-portal__brand"><span className="customer-portal__brand-mark"><ShieldCheck aria-hidden="true" size={18} /></span> AFhomes Customer Portal</p>;
}

export function CustomerPortalPage() {
  const { customerId } = useCustomerPortal();
  return customerId ? <PortalDashboard /> : <PortalLogin />;
}

function PortalLogin() {
  const { samples, signIn } = useCustomerPortal();
  const sample = samples[0];
  const [email, setEmail] = useState(sample?.email ?? "");
  const [error, setError] = useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      signIn(email);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not sign in.");
    }
  };

  return (
    <main className="customer-portal customer-portal--login">
      <PortalBrand />
      <section className="customer-portal__login-card">
        <p className="customer-portal__eyebrow">Prototype sign-in</p>
        <h1 className="customer-portal__title">Your points, in one place</h1>
        <p className="customer-portal__lede">View your VIP membership, Stay Points, Promo Points and activity. This prototype uses synthetic data and is not production authentication.</p>
        {sample ? (
          <form className="customer-portal__login-form" onSubmit={submit}>
            <TextField label="Email" required value={email} onChange={(value) => { setEmail(value); setError(undefined); }} hint="Use the sample customer email for this prototype." />
            {error ? <p role="alert" className="tw:text-sm tw:text-destructive">{error}</p> : null}
            <Button type="submit">Continue to Demo Portal</Button>
            <Button type="button" variant="outline" onClick={() => setEmail(sample.email)}>Use Sample Account</Button>
          </form>
        ) : <p role="alert" className="customer-portal__warning">No sample customer is configured.</p>}
        <p className="customer-portal__sample">Sample customer: <strong>{sample?.displayName ?? "None"}</strong>{sample ? <> · {sample.email}</> : null}</p>
      </section>
    </main>
  );
}

function PortalDashboard() {
  const { customer, signOut } = useCustomerPortal();
  const overview = useCustomerPortalOverview();
  const [editing, setEditing] = useState(false);

  return (
    <main className="customer-portal">
      <header className="customer-portal__header">
        <div>
          <PortalBrand />
          <p className="customer-portal__eyebrow">Welcome back</p>
          <h1 className="customer-portal__name">{customer?.displayName ?? overview.data?.customer.displayName ?? "Customer"}</h1>
          {overview.data ? <p className="customer-portal__subtext">Customer ID: {overview.data.customer.customerNumber ?? "Not recorded"}</p> : null}
        </div>
        <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" /> Sign Out</Button>
      </header>

      {overview.isPending ? <p role="status" className="customer-portal__empty">Loading your account…</p> : null}
      {overview.isError ? <p role="alert" className="customer-portal__warning">{overview.error instanceof Error ? overview.error.message : "Could not load your account."}</p> : null}
      {overview.data ? <PortalContent overview={overview.data} onEdit={() => setEditing(true)} /> : null}
      {editing && overview.data ? <ContactDialog overview={overview.data} onClose={() => setEditing(false)} /> : null}
    </main>
  );
}

function PortalContent({ overview, onEdit }: { overview: PortalOverview; onEdit: () => void }) {
  const { membership } = overview;
  return (
    <>
      <div className="customer-portal__grid customer-portal__grid--two">
        <section className="customer-portal__panel" aria-labelledby="portal-membership">
          <h2 id="portal-membership" className="customer-portal__panel-title">VIP membership</h2>
          <p className="customer-portal__balance">{membership.tierName}</p>
          <dl className="customer-portal__facts">
            <div className="customer-portal__fact"><dt>VIP Number</dt><dd>{membership.cardId ?? "Not issued"}</dd></div>
            <div className="customer-portal__fact"><dt>Status</dt><dd>{membership.status}</dd></div>
            <div className="customer-portal__fact"><dt>Activated</dt><dd>{formatDate(membership.activationDate)}</dd></div>
            <div className="customer-portal__fact"><dt>Valid until</dt><dd>{formatDate(membership.validityEndDate)}</dd></div>
          </dl>
          {membership.financialHold ? <p className="customer-portal__warning">Financial hold: new benefit use is restricted until Finance restores eligibility.</p> : null}
        </section>
        <section className="customer-portal__panel" aria-labelledby="portal-qr">
          <h2 id="portal-qr" className="customer-portal__panel-title">Your membership QR</h2>
          <p className="customer-portal__subtext">Show this to authorized staff when earning or using Promo Points.</p>
          {overview.qr.length ? overview.qr.map((qr) => <CustomerQr key={`${qr.holder}-${qr.code}`} qr={qr} />) : <p className="customer-portal__empty">No active cardholder QR is available.</p>}
        </section>
      </div>

      <div className="customer-portal__grid customer-portal__grid--two">
        <section className="customer-portal__panel" aria-labelledby="portal-promo">
          <h2 id="portal-promo" className="customer-portal__panel-title">Promo Points</h2>
          <p className="customer-portal__balance">{points(overview.promo.total.available)} <span className="customer-portal__balance-label">available</span></p>
          <p className="customer-portal__subtext">Separate from Stay Points. Earned on eligible approved bills under configured promos.</p>
          {overview.promo.byPromo.length ? <dl className="customer-portal__facts">{overview.promo.byPromo.map((item) => <div key={item.promoId} className="customer-portal__fact"><dt>{item.promoName}</dt><dd>{points(item.balance.available)}</dd></div>)}</dl> : <p className="customer-portal__empty">No Promo Points activity yet.</p>}
        </section>
        <section className="customer-portal__panel" aria-labelledby="portal-stay">
          <h2 id="portal-stay" className="customer-portal__panel-title">Stay Points</h2>
          {overview.stay ? <>
            <p className="customer-portal__balance">{points(overview.stay.spendableWeekday + overview.stay.spendableWeekend)} <span className="customer-portal__balance-label">available</span></p>
            <dl className="customer-portal__facts">
              <div className="customer-portal__fact"><dt>Weekday</dt><dd>{points(overview.stay.spendableWeekday)}</dd></div>
              <div className="customer-portal__fact"><dt>Weekend / holiday</dt><dd>{points(overview.stay.spendableWeekend)}</dd></div>
              <div className="customer-portal__fact"><dt>Reserved</dt><dd>{points(overview.stay.reserved)}</dd></div>
              <div className="customer-portal__fact"><dt>Redeemed</dt><dd>{points(overview.stay.redeemed)}</dd></div>
            </dl>
          </> : <p className="customer-portal__empty">No Stay Points ledger yet.</p>}
          <p className="customer-portal__subtext">Stay Points pay for eligible overnight accommodation only.</p>
        </section>
      </div>

      <div className="customer-portal__grid customer-portal__grid--two">
        <section className="customer-portal__panel" aria-labelledby="portal-profile">
          <div className="customer-portal__header">
            <h2 id="portal-profile" className="customer-portal__panel-title">Contact information</h2>
            <Button variant="outline" onClick={onEdit}><Pencil aria-hidden="true" /> Edit Contact</Button>
          </div>
          <dl className="customer-portal__facts">
            <div className="customer-portal__fact"><dt>Mobile</dt><dd>{overview.customer.mobileNumber || "Not recorded"}</dd></div>
            <div className="customer-portal__fact"><dt>Email</dt><dd>{overview.customer.email || "Not recorded"}</dd></div>
            <div className="customer-portal__fact"><dt>Landline</dt><dd>{overview.customer.landline || "Not recorded"}</dd></div>
          </dl>
          <p className="customer-portal__subtext">Only these contact fields can be edited here. Identity, government ID, Customer ID and card data stay read-only.</p>
        </section>
        <section className="customer-portal__panel" aria-labelledby="portal-activity">
          <h2 id="portal-activity" className="customer-portal__panel-title">Activity</h2>
          {overview.activity.length ? <ActivityList items={overview.activity} /> : <p className="customer-portal__empty">No points activity yet.</p>}
        </section>
      </div>
    </>
  );
}

function ActivityList({ items }: { items: PortalActivity[] }) {
  return (
    <ul className="customer-portal__activity">
      {items.map((item) => (
        <li key={item.id}>
          <div className="customer-portal__activity-head">
            <span className="customer-portal__activity-label">{item.label}</span>
            {item.points !== null ? <span className={`customer-portal__activity-points customer-portal__activity-points--${item.direction}`}>{item.direction === "credit" ? "+" : "−"}{points(item.points)}</span> : null}
          </div>
          <span className="customer-portal__activity-detail">{formatDate(item.date)}{item.detail ? ` · ${item.detail}` : ""}{item.reference ? ` · ${item.reference}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}

function ContactDialog({ overview, onClose }: { overview: PortalOverview; onClose: () => void }) {
  const update = useUpdatePortalContact();
  const [mobileNumber, setMobileNumber] = useState(overview.customer.mobileNumber);
  const [email, setEmail] = useState(overview.customer.email);
  const [landline, setLandline] = useState(overview.customer.landline);
  const [error, setError] = useState<string>();
  const [values] = useState<PortalContactInput>({ mobileNumber: overview.customer.mobileNumber, email: overview.customer.email, landline: overview.customer.landline });

  const submit = async () => {
    try {
      await update.mutateAsync({ ...values, mobileNumber, email, landline });
      toast.success("Contact information saved.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save your contact information.");
    }
  };

  return (
    <FormDialog open title="Edit Contact Information" description="Only mobile, email and landline can be changed." submitText="Save" pending={update.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <TextField label="Mobile number" required value={mobileNumber} maxLength={11} onChange={(value) => { setMobileNumber(value); setError(undefined); }} />
      <TextField label="Email" required value={email} maxLength={254} onChange={(value) => { setEmail(value); setError(undefined); }} />
      <TextField label="Landline" value={landline} maxLength={20} onChange={(value) => { setLandline(value); setError(undefined); }} />
    </FormDialog>
  );
}
