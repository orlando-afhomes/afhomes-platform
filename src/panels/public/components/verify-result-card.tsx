"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, Copy, Headset, Info, Mail, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { PublicAccreditationResult } from "@/data/contracts/accreditation-repository";
import { PUBLIC_SUPPORT_INFO, type SupportBankAccount } from "@/modules/public-site/support-info";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

/** Result of the public seller check: v2 output (masked name, photo, Copy ID, support) with v3 rules. */
export function VerifyResultCard({ result }: { result: PublicAccreditationResult }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const name = result.maskedName ?? "Name unavailable";
  const expired = result.status === "expired";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(result.aaNumber);
      toast.success("AA number copied.");
    } catch {
      toast.error("Could not copy. Select the number and copy it instead.");
    }
  };

  return (
    <section className="verify-result" aria-label="Verification result">
      <div className="verify-result__identity">
        <span className="verify-result__eyebrow">Employee Identity</span>
        <button
          type="button"
          className="verify-result__photo-button"
          onClick={() => setPhotoOpen(true)}
          disabled={!result.photoUrl}
          aria-label={result.photoUrl ? `View profile photo of ${name}` : undefined}
        >
          <Avatar className="verify-result__avatar">
            {result.photoUrl ? <AvatarImage src={result.photoUrl} alt={name} /> : null}
            <AvatarFallback className="verify-result__avatar-fallback">{name.charAt(0)}</AvatarFallback>
          </Avatar>
        </button>
        <h2 className="verify-result__name">{name}</h2>
        <div className="verify-result__number">
          <span className="verify-result__number-text">{result.aaNumber}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyId()} className="verify-result__copy tw:min-h-11 tw:sm:min-h-8">
            <Copy aria-hidden="true" />
            Copy ID
          </Button>
        </div>
      </div>

      <dl className="verify-result__facts">
        <div className="verify-result__fact">
          <dt>Verification Status</dt>
          <dd className={expired ? "verify-result__status verify-result__status--expired" : "verify-result__status verify-result__status--valid"}>
            {expired ? null : <BadgeCheck aria-hidden="true" className="tw:size-4" />}
            {expired ? "Expired" : "Accredited"}
          </dd>
        </div>
        <div className="verify-result__fact">
          <dt>Type</dt>
          <dd>{result.classification}</dd>
        </div>
      </dl>
      {result.quotedNumberSuperseded ? (
        <p className="verify-result__note">The number you entered was replaced when this accreditation was renewed. The current number is shown.</p>
      ) : null}

      <SupportBlock />

      <Dialog open={photoOpen && !!result.photoUrl} onOpenChange={setPhotoOpen}>
        <DialogContent className="tw:sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile photo</DialogTitle>
          </DialogHeader>
          {result.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external mock photo URL, not an optimized asset
            <img src={result.photoUrl} alt={name} className="verify-result__photo-large" />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SupportBlock() {
  const info = PUBLIC_SUPPORT_INFO;

  const copyAccount = async (account: SupportBankAccount) => {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      toast.success(`${account.bankName} account number copied.`);
    } catch {
      toast.error("Could not copy. Select the number and copy it instead.");
    }
  };

  return (
    <div className="verify-support">
      <div className="verify-support__header">
        <span className="verify-support__badge" aria-hidden="true"><Headset /></span>
        <div className="verify-support__intro">
          <h3 className="verify-support__heading">{info.heading}</h3>
          <p className="verify-support__lede">Reach the official AFhomes team, or use only the company accounts listed below.</p>
        </div>
      </div>

      <ul className="verify-support__contacts">
        <li>
          <a href={`mailto:${info.email}`}>
            <span className="verify-support__contact-icon" aria-hidden="true"><Mail /></span>
            <span className="verify-support__contact-text">
              <span className="verify-support__contact-label">Email</span>
              {info.email}
            </span>
          </a>
        </li>
        <li>
          <a href={info.phoneHref}>
            <span className="verify-support__contact-icon" aria-hidden="true"><Phone /></span>
            <span className="verify-support__contact-text">
              <span className="verify-support__contact-label">Call</span>
              {info.phone}
            </span>
          </a>
        </li>
      </ul>

      <section className="verify-support__accounts" aria-labelledby="verify-support-accounts-heading">
        <p id="verify-support-accounts-heading" className="verify-support__label">Official company bank accounts</p>
        <p className="verify-support__holder"><span>Account name</span>{info.bankAccountName}</p>
        <div className="verify-support__banks">
          {info.bankAccounts.map((account) => (
            <div key={account.accountNumber} className="verify-support__bank">
              <div className="verify-support__bank-top">
                <span className="verify-support__bank-logo">
                  <Image src={account.logo} alt="" width={160} height={32} unoptimized />
                </span>
                <button
                  type="button"
                  className="verify-support__copy"
                  aria-label={`Copy ${account.bankName} account number`}
                  onClick={() => void copyAccount(account)}
                >
                  <Copy aria-hidden="true" />
                </button>
              </div>
              <div className="verify-support__bank-body">
                <span className="verify-support__bank-name">{account.bankName}</span>
                <span className="verify-support__bank-label">Account number</span>
                <span className="verify-support__bank-number">{account.accountNumber}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="verify-support__cheque">
          <span className="verify-support__label">Cheque payable to</span>
          <p>{info.chequePayee}</p>
        </div>
      </section>

      <div className="verify-support__notices">
        <p className="verify-support__reminder"><Info aria-hidden="true" />{info.bankReminder}</p>
        <p className="verify-support__reminder verify-support__reminder--strong"><ShieldCheck aria-hidden="true" />{info.agentReminder}</p>
      </div>
    </div>
  );
}
