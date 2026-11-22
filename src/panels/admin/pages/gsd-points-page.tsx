"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ScanLine } from "lucide-react";
import type { MemberQrHolder } from "@/data/contracts/member-qr-repository";
import { usePromoBalances, usePromos, useRecordPromoUse } from "@/data/promo-queries";
import { useOutlets } from "@/data/settings-queries";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { CheckboxField, SelectField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ScanMemberQrButton } from "../components/member-qr";

/**
 * Prototype GSD counter flow. A scan selects one holder; staff verify the ID, choose a
 * configured named reward, and record the use. Nothing is credited by scanning alone.
 */
export function GsdPointsPanel() {
  const [holder, setHolder] = useState<MemberQrHolder | null>(null);
  const promos = usePromos();
  const balances = usePromoBalances();
  const outlets = useOutlets();
  const record = useRecordPromoUse();
  const { confirmRun, dialog } = useConfirmRun();
  const [promoId, setPromoId] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [identityChecked, setIdentityChecked] = useState(false);
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string>();

  const active = (promos.data ?? []).filter((promo) => promo.status === "active");
  const promo = active.find((item) => item.id === promoId);
  const reward = promo?.rewards.find((item) => item.id === rewardId && item.status === "active");
  const available = balances.data?.find((item) => item.membershipId === holder?.membershipId)
    ?.byPromo.find((item) => item.promoId === promoId)?.balance.available ?? 0;
  const outletName = (id: string) => outlets.data?.find((outlet) => outlet.id === id)?.name ?? id;

  const reset = () => {
    setRewardId("");
    setIdentityChecked(false);
    setNote("");
    setRequestId(crypto.randomUUID());
    setError(undefined);
  };

  const submit = () => {
    if (!holder) return setError("Scan the customer's membership QR first.");
    if (!promo || !reward) return setError("Select a promo and an available reward.");
    if (!identityChecked) return setError("Confirm you checked the cardholder's ID.");
    if (reward.pointsCost > available) return setError(`Only ${available.toLocaleString("en-PH")} Promo Points are available.`);
    confirmRun({
      title: "Record this reward use?",
      description: `${holder.holderName} · ${holder.vipNumber}: ${reward.name} for ${reward.pointsCost.toLocaleString("en-PH")} Promo Points at ${outletName(reward.outletId)}. Expected balance: ${(available - reward.pointsCost).toLocaleString("en-PH")}.`,
      confirmText: "Record Use",
      action: async () => {
        const entry = await record.mutateAsync({
          requestId, membershipId: holder.membershipId, promoId: promo.id, rewardId: reward.id,
          holder: holder.holder, identityChecked, scannedCode: holder.scannedCode, note,
        });
        toast.success("Promo Points use recorded.", { description: `Reference ${entry.id}` });
        reset();
      },
      successTitle: "Reward recorded.",
      errorTitle: "Could not record the reward.",
    });
  };

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>GSD counter service</CardTitle>
            <CardDescription>Scan the customer’s membership QR, verify their ID, then record an eligible reward use.</CardDescription>
          </div>
          <ScanMemberQrButton onSelect={(selected) => { setHolder(selected); setPromoId(""); reset(); }} />
        </CardHeader>
        <CardContent>
          {holder ? (
            <div className="tw:flex tw:flex-col tw:gap-3">
              <p className="tw:text-sm"><span className="tw:font-semibold">{holder.holderName}</span> · {holder.vipNumber} · {holder.financialHold ? "Financial hold" : "Active"}</p>
              <SelectField label="Promo" required value={promoId} placeholder="Select a promo"
                options={active.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => { setPromoId(value); setRewardId(""); setError(undefined); }} />
              <SelectField label="Reward" required value={rewardId} placeholder="Select a configured reward" disabled={!promo}
                options={(promo?.rewards ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.id, label: `${item.name} · ${item.pointsCost.toLocaleString("en-PH")} points` }))}
                onChange={(value) => { setRewardId(value); setError(undefined); }} />
              {promo && reward ? <p className="tw:text-sm tw:text-muted-foreground">{outletName(reward.outletId)} · Available: {available.toLocaleString("en-PH")} points</p> : null}
              <CheckboxField label="I checked the cardholder’s ID" checked={identityChecked} onChange={(checked) => { setIdentityChecked(checked); setError(undefined); }} />
              <TextField label="Note" value={note} maxLength={200} onChange={setNote} />
              {error ? <p role="alert" className="tw:text-sm tw:text-destructive">{error}</p> : null}
              <div>
                <Button type="button" onClick={submit} loading={record.isPending} disabled={!promo || !reward || !identityChecked}>Record Reward Use</Button>
              </div>
            </div>
          ) : (
            <p className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground"><ScanLine aria-hidden="true" /> No customer selected. Scan a QR to begin.</p>
          )}
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}
