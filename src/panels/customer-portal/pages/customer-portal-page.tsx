"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Activity, BedDouble, CalendarCheck, CalendarDays, Camera, ChevronRight, Eye, EyeOff, Gift, House, IdCard, Inbox, LogOut, Mail, Pencil, Phone, QrCode, Receipt, Smartphone, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import { useCustomerPortal } from "@/shared/providers/customer-portal-provider";
import { useCustomerPortalOverview, useUpdatePortalContact, useUpdatePortalPhoto } from "@/data/customer-portal-queries";
import type { PortalActivity, PortalContactInput, PortalOverview } from "@/modules/customer-portal/types";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { validateProfileImageFile } from "@/shared/forms/validation/image";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useTabParam } from "@/shared/components/modern/use-tab-param";
import { LoginShell } from "@/panels/public/login/login-shell";
import { CustomerQr } from "../components/customer-qr";
import "../customer-portal.css";

const points = (value: number) => value.toLocaleString("en-PH");

export function CustomerPortalPage() {
  const { customerId } = useCustomerPortal();
  return customerId ? <PortalDashboard /> : <PortalLogin />;
}

function PortalLogin() {
  const { signIn } = useCustomerPortal();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const errorId = `${id}-error`;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    try {
      signIn(email, password);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not sign in.");
    }
  };

  return (
    <LoginShell year={new Date().getFullYear()}>
      <form noValidate onSubmit={submit} className="login-form__view tw:flex tw:flex-col tw:gap-5">
        <div className="tw:flex tw:flex-col tw:gap-2">
          <h1 className="tw:text-3xl tw:font-semibold">Customer Login</h1>
          <p className="tw:text-sm tw:text-(--color-on-dark-muted)">Sign in to view your VIP membership, Stay Points, Promo Points and activity.</p>
        </div>
        <div className="tw:flex tw:flex-col tw:gap-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="username"
            placeholder="Enter your email"
            className="login-form__input"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setError(undefined); }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <div className="tw:flex tw:flex-col tw:gap-2">
          <Label htmlFor={`${id}-password`}>Password</Label>
          <div className="tw:relative">
            <Input
              id={`${id}-password`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="login-form__input tw:pr-12"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(undefined); }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            <button
              type="button"
              className="login-form__toggle tw:absolute tw:top-1/2 tw:right-3 tw:-translate-y-1/2 tw:p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff className="tw:size-4" aria-hidden="true" /> : <Eye className="tw:size-4" aria-hidden="true" />}
            </button>
          </div>
          {error ? <p id={errorId} role="alert" className="login-form__error">{error}</p> : null}
          <Link href="/contact" className="login-form__link tw:self-end">Forgot Password?</Link>
        </div>
        <Button type="submit" className="login-form__submit">Sign In</Button>
        <div className="tw:flex tw:justify-center">
          <Link href="/" className="login-form__link">Back to Website</Link>
        </div>
      </form>
    </LoginShell>
  );
}

const TABS = [
  { value: "home", label: "Home", icon: House },
  { value: "qr", label: "QR", icon: QrCode },
  { value: "activity", label: "Activity", icon: Activity },
  { value: "profile", label: "Profile", icon: UserRound },
] as const;
type PortalTab = (typeof TABS)[number]["value"];
const TAB_VALUES = TABS.map((tab) => tab.value);

// Approved card artwork for the standard tiers; a tier without approved artwork shows its details only.
const CARD_IMAGES: Record<string, string> = { B1: "/images/cards/bronze.webp", S1: "/images/cards/silver.webp", G1: "/images/cards/gold.webp" };

const ACTIVITY_ICONS = { promo: Gift, stay: BedDouble, booking: CalendarCheck, bill: Receipt } as const;

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";

function PortalAvatar({ name, photoUrl, large = false }: { name: string; photoUrl?: string | null; large?: boolean }) {
  return (
    <span className={`customer-portal-app__avatar${large ? " customer-portal-app__avatar--large" : ""}`}>
      {photoUrl ? (
        // The picture is a data URL kept in this browser session.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={`Profile picture of ${name}`} className="customer-portal-app__avatar-image" />
      ) : <span aria-hidden="true">{initialsOf(name)}</span>}
    </span>
  );
}

function PortalDashboard() {
  const { customer, signOut } = useCustomerPortal();
  const overview = useCustomerPortalOverview();
  const [editing, setEditing] = useState(false);
  const [tab, selectTab] = useTabParam<PortalTab>(TAB_VALUES);
  const name = customer?.displayName ?? overview.data?.customer.displayName ?? "Customer";
  const photoUrl = overview.data?.customer.photoUrl ?? null;

  return (
    <main className="customer-portal-app">
      <div className="customer-portal-app__shell">
        <header className="customer-portal-app__header">
          <PortalAvatar name={name} photoUrl={photoUrl} />
          <div className="customer-portal-app__greeting">
            <h1 className="customer-portal-app__name">{name}</h1>
            {overview.data ? <p className="customer-portal-app__subtext">{overview.data.membership.tierName}</p> : null}
          </div>
          <button type="button" className="customer-portal-app__icon-button" onClick={signOut} aria-label="Sign Out">
            <LogOut aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="customer-portal-app__screen">
          {overview.isPending ? <p role="status" className="customer-portal__empty">Loading your account…</p> : null}
          {overview.isError ? <p role="alert" className="customer-portal__warning">{overview.error instanceof Error ? overview.error.message : "Could not load your account."}</p> : null}
          {overview.data && tab === "home" ? <HomeTab overview={overview.data} onGo={selectTab} /> : null}
          {overview.data && tab === "qr" ? <QrTab overview={overview.data} /> : null}
          {overview.data && tab === "activity" ? <ActivityTab overview={overview.data} /> : null}
          {overview.data && tab === "profile" ? <ProfileTab overview={overview.data} name={name} onEdit={() => setEditing(true)} onSignOut={signOut} /> : null}
        </div>

        <nav className="customer-portal-app__tabbar" aria-label="Portal sections">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" className="customer-portal-app__tab" aria-current={tab === value ? "page" : undefined} onClick={() => selectTab(value)}>
              <Icon aria-hidden="true" size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      {editing && overview.data ? <ContactDialog overview={overview.data} onClose={() => setEditing(false)} /> : null}
    </main>
  );
}

function Row({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="customer-portal-app__row">
      {Icon ? <span className="customer-portal-app__row-icon" aria-hidden="true"><Icon size={18} /></span> : null}
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function HomeTab({ overview, onGo }: { overview: PortalOverview; onGo: (tab: PortalTab) => void }) {
  const { membership } = overview;
  const [wallet, setWallet] = useState<"promo" | "stay" | null>(null);
  const stayAvailable = overview.stay ? overview.stay.spendableWeekday + overview.stay.spendableWeekend : 0;
  const cardImage = CARD_IMAGES[membership.productCode];
  return (
    <>
      <section className="customer-portal-app__group" aria-labelledby="portal-membership">
        {cardImage ? <Image src={cardImage} alt={`${membership.tierName} Privilege Card`} width={1920} height={1198} sizes="(min-width: 448px) 408px, 90vw" priority className="customer-portal-app__card-image" /> : null}
        <div className="customer-portal-app__card-caption">
          <div>
            <h2 id="portal-membership" className="customer-portal-app__group-title">{membership.tierName}</h2>
            <p className="customer-portal-app__subtext">{membership.cardId ?? "Not issued"} · Valid until {formatDate(membership.validityEndDate)}</p>
          </div>
          <span className="customer-portal-app__status">{membership.status}</span>
        </div>
      </section>

      {membership.financialHold ? (
        <p className="customer-portal__warning customer-portal-app__hold"><TriangleAlert aria-hidden="true" size={18} /> Benefit use is on hold. Please contact AFhomes Finance.</p>
      ) : null}

      <div className="customer-portal-app__tiles">
        <button type="button" className="customer-portal-app__tile" onClick={() => setWallet("promo")}>
          <span className="customer-portal-app__tile-icon" aria-hidden="true"><Gift size={20} /></span>
          <span className="customer-portal-app__tile-title">Promo Points</span>
          <span className="customer-portal-app__tile-value">{points(overview.promo.total.available)}</span>
          <ChevronRight className="customer-portal-app__tile-chevron" aria-hidden="true" size={18} />
        </button>
        <button type="button" className="customer-portal-app__tile" onClick={() => setWallet("stay")}>
          <span className="customer-portal-app__tile-icon" aria-hidden="true"><BedDouble size={20} /></span>
          <span className="customer-portal-app__tile-title">Stay Points</span>
          <span className="customer-portal-app__tile-value">{points(stayAvailable)}</span>
          <ChevronRight className="customer-portal-app__tile-chevron" aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="customer-portal-app__shortcuts">
        <button type="button" className="customer-portal-app__shortcut" onClick={() => onGo("qr")}><QrCode aria-hidden="true" size={22} /><span>Show QR</span></button>
        <button type="button" className="customer-portal-app__shortcut" onClick={() => onGo("activity")}><Activity aria-hidden="true" size={22} /><span>Activity</span></button>
        <button type="button" className="customer-portal-app__shortcut" onClick={() => onGo("profile")}><UserRound aria-hidden="true" size={22} /><span>Profile</span></button>
      </div>

      <Dialog open={wallet !== null} onOpenChange={(next) => { if (!next) setWallet(null); }}>
        <DialogContent className="tw:max-h-[90dvh] tw:overflow-auto">
          {wallet === "promo" ? (
            <>
              <DialogHeader>
                <DialogTitle>Promo Points</DialogTitle>
                <DialogDescription>Earned on eligible approved bills. Separate from Stay Points.</DialogDescription>
              </DialogHeader>
              <p className="customer-portal-app__dialog-total">{points(overview.promo.total.available)} <span>available</span></p>
              {overview.promo.byPromo.length ? (
                <dl className="customer-portal-app__list">{overview.promo.byPromo.map((item) => <Row key={item.promoId} label={item.promoName} value={points(item.balance.available)} />)}</dl>
              ) : <p className="customer-portal__empty">No promo points yet.</p>}
            </>
          ) : null}
          {wallet === "stay" ? (
            <>
              <DialogHeader>
                <DialogTitle>Stay Points</DialogTitle>
                <DialogDescription>For eligible overnight accommodation only.</DialogDescription>
              </DialogHeader>
              {overview.stay ? (
                <>
                  <p className="customer-portal-app__dialog-total">{points(stayAvailable)} <span>available</span></p>
                  <dl className="customer-portal-app__list">
                    <Row label="Weekday" value={points(overview.stay.spendableWeekday)} />
                    <Row label="Weekend / holiday" value={points(overview.stay.spendableWeekend)} />
                    <Row label="Reserved" value={points(overview.stay.reserved)} />
                    <Row label="Redeemed" value={points(overview.stay.redeemed)} />
                  </dl>
                </>
              ) : <p className="customer-portal__empty">No Stay Points yet.</p>}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function QrTab({ overview }: { overview: PortalOverview }) {
  return (
    <section className="customer-portal-app__group" aria-labelledby="portal-qr">
      <h2 id="portal-qr" className="customer-portal-app__section-title">Your membership QR</h2>
      <p className="customer-portal-app__help">Show this to staff when you earn or use points.</p>
      {overview.qr.length ? overview.qr.map((qr) => <CustomerQr key={`${qr.holder}-${qr.code}`} qr={qr} />) : <p className="customer-portal__empty">No active cardholder QR is available.</p>}
    </section>
  );
}

function ActivityTab({ overview }: { overview: PortalOverview }) {
  return (
    <section aria-labelledby="portal-activity">
      <h2 id="portal-activity" className="customer-portal-app__section-title">Activity</h2>
      {overview.activity.length ? <ActivityList items={overview.activity} /> : (
        <div className="customer-portal-app__empty">
          <Inbox aria-hidden="true" size={32} />
          <p>No activity yet.</p>
        </div>
      )}
    </section>
  );
}

function ProfileTab({ overview, name, onEdit, onSignOut }: { overview: PortalOverview; name: string; onEdit: () => void; onSignOut: () => void }) {
  const { membership } = overview;
  const update = useUpdatePortalPhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string>();

  const pick = (file: File) => {
    setPhotoError(undefined);
    const invalid = validateProfileImageFile(file);
    if (invalid) return setPhotoError(invalid);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return setPhotoError("Could not read the image.");
      update.mutate({ dataUrl: reader.result, fileName: file.name }, {
        onSuccess: () => toast.success("Profile picture saved."),
        onError: (failure) => setPhotoError(failure instanceof Error ? failure.message : "Could not save the picture."),
      });
    };
    reader.onerror = () => setPhotoError("Could not read the image.");
    reader.readAsDataURL(file);
  };

  const remove = () => {
    setPhotoError(undefined);
    update.mutate(null, {
      onSuccess: () => toast.success("Profile picture removed."),
      onError: (failure) => setPhotoError(failure instanceof Error ? failure.message : "Could not remove the picture."),
    });
  };

  return (
    <>
      <section className="customer-portal-app__profile-head" aria-labelledby="portal-profile">
        <div className="customer-portal-app__photo">
          <PortalAvatar name={name} photoUrl={overview.customer.photoUrl} large />
          <input ref={fileInput} type="file" accept="image/*" className="tw:sr-only" tabIndex={-1} aria-label="Profile picture file" onChange={(event) => { const file = event.target.files?.[0]; if (file) pick(file); event.target.value = ""; }} />
          <button type="button" className="customer-portal-app__camera" aria-label="Change profile picture" disabled={update.isPending} onClick={() => fileInput.current?.click()}>
            <Camera aria-hidden="true" size={18} />
          </button>
        </div>
        <h2 id="portal-profile" className="customer-portal-app__section-title">{name}</h2>
        {overview.customer.photoUrl ? <button type="button" className="customer-portal-app__text-button" disabled={update.isPending} onClick={remove}>Remove photo</button> : null}
        {photoError ? <p role="alert" className="customer-portal-app__error">{photoError}</p> : null}
      </section>

      <section className="customer-portal-app__group" aria-label="Membership">
        <dl className="customer-portal-app__list">
          <Row icon={IdCard} label="VIP Number" value={membership.cardId ?? "Not issued"} />
          <Row icon={CalendarDays} label="Activated" value={formatDate(membership.activationDate)} />
          <Row icon={CalendarCheck} label="Valid until" value={formatDate(membership.validityEndDate)} />
        </dl>
      </section>

      <section className="customer-portal-app__group" aria-label="Contact information">
        <div className="customer-portal-app__group-head">
          <h2 className="customer-portal-app__group-title">Contact</h2>
          <Button variant="outline" size="lg" onClick={onEdit}><Pencil aria-hidden="true" /> Edit Contact</Button>
        </div>
        <dl className="customer-portal-app__list">
          <Row icon={Smartphone} label="Mobile" value={overview.customer.mobileNumber || "Not recorded"} />
          <Row icon={Mail} label="Email" value={overview.customer.email || "Not recorded"} />
          <Row icon={Phone} label="Landline" value={overview.customer.landline || "Not recorded"} />
        </dl>
        <p className="customer-portal-app__help">Name, ID and card details can’t be changed here.</p>
      </section>

      <button type="button" className="customer-portal-app__signout" onClick={onSignOut}><LogOut aria-hidden="true" size={18} /> Sign Out</button>
    </>
  );
}

function ActivityList({ items }: { items: PortalActivity[] }) {
  return (
    <ul className="customer-portal-app__activity">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.kind];
        return (
          <li key={item.id} className="customer-portal-app__activity-item">
            <span className="customer-portal-app__activity-icon" aria-hidden="true"><Icon size={18} /></span>
            <div className="customer-portal-app__activity-body">
              <span className="customer-portal-app__activity-label">{item.label}</span>
              <span className="customer-portal-app__activity-detail">{formatDate(item.date)}{item.detail ? ` · ${item.detail}` : ""}{item.reference ? ` · ${item.reference}` : ""}</span>
            </div>
            {item.points !== null ? <span className={`customer-portal-app__activity-points customer-portal-app__activity-points--${item.direction}`}>{item.direction === "credit" ? "+" : "−"}{points(item.points)}</span> : null}
          </li>
        );
      })}
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
