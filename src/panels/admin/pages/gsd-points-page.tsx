"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { MemberQrHolder } from "@/data/contracts/member-qr-repository";
import { usePromoBalances, usePromos, useRecordPromoUse } from "@/data/promo-queries";
import { useOutlets } from "@/data/settings-queries";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { CheckboxField, SelectField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Coins, ShieldCheck } from "lucide-react";

/** Prototype GSD counter flow. Staff verify the ID, choose a configured named reward, and record the use. Nothing is credited by scanning alone. */
export function GsdRewardForm({ holder, idVerified = false }: { holder: MemberQrHolder; idVerified?: boolean }) {
  const promos = usePromos();
  const balances = usePromoBalances(holder.scannedCode);
  const outlets = useOutlets();
  const record = useRecordPromoUse();
  const { confirmRun, dialog } = useConfirmRun();
  const [promoId, setPromoId] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [identityChecked, setIdentityChecked] = useState(false);
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string>();

  const offers = (promos.data ?? []).filter((promo) => promo.status !== "draft" && promo.rewards.some((reward) => reward.status === "active"));
  const promo = offers.find((item) => item.id === promoId);
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
    if (!promo || !reward) return setError("Select an offer and an available reward.");
    if (!identityChecked && !idVerified) return setError("Confirm you checked the cardholder's ID.");
    if (reward.pointsCost > available) return setError(`Only ${available.toLocaleString("en-PH")} reward points are available.`);
    confirmRun({
      title: "Redeem points for this reward?",
      description: `${holder.holderName} · ${holder.vipNumber}: ${reward.name} for ${reward.pointsCost.toLocaleString("en-PH")} points at ${outletName(reward.outletId)}. Points left: ${(available - reward.pointsCost).toLocaleString("en-PH")}.`,
      confirmText: "Redeem Points",
      action: async () => {
        const entry = await record.mutateAsync({
          requestId, membershipId: holder.membershipId, promoId: promo.id, rewardId: reward.id,
          holder: holder.holder, identityChecked: idVerified || identityChecked, scannedCode: holder.scannedCode, note,
        });
        toast.success("Points redeemed.", { description: `Reference ${entry.id}` });
        reset();
      },
      successTitle: "Reward recorded.",
      errorTitle: "Could not record the reward.",
    });
  };

  if (balances.isError || promos.isError || outlets.isError) return <p role="alert">Could not load rewards or points. Try scanning again.</p>;
  if (balances.isPending || promos.isPending || outlets.isPending) return <p role="status">Loading rewards and points…</p>;
  if (offers.length === 0) return <p>No rewards are available right now.</p>;
  return (
    <>
      <div className="tw:flex tw:flex-col tw:gap-3">
        {!idVerified ? <p className="tw:text-sm"><strong>{holder.holderName}</strong> · {holder.vipNumber} · {holder.financialHold ? "Financial hold" : "Active"}</p> : null}
        <SelectField label="Offer" required value={promoId} placeholder="Select an offer"
          options={offers.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => { setPromoId(value); setRewardId(""); setError(undefined); }} />
        <SelectField label="Reward" required value={rewardId} placeholder="Choose a reward" disabled={!promo}
          options={(promo?.rewards ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.id, label: `${item.name} · ${item.pointsCost.toLocaleString("en-PH")} points` }))}
          onChange={(value) => { setRewardId(value); setError(undefined); }} />
        {promo ? <p role="status" className="tw:text-sm tw:text-muted-foreground">
          {reward ? `${outletName(reward.outletId)} · Points needed: ${reward.pointsCost.toLocaleString("en-PH")} · ` : ""}
          Available: {available.toLocaleString("en-PH")} points
        </p> : null}
        {!idVerified ? <CheckboxField variant="card" icon={<ShieldCheck className="tw:size-5" />} label="I checked the cardholder’s ID" checked={identityChecked} onChange={(checked) => { setIdentityChecked(checked); setError(undefined); }} /> : null}
        <TextField label="Note" value={note} maxLength={200} onChange={setNote} />
        {error ? <p role="alert" className="tw:text-sm tw:text-destructive">{error}</p> : null}
        <div>
          <Button type="button" onClick={submit} loading={record.isPending} disabled={!promo || !reward || (!identityChecked && !idVerified)}><Coins aria-hidden="true" />Redeem Points</Button>
        </div>
      </div>
      {dialog}
    </>
  );
}
