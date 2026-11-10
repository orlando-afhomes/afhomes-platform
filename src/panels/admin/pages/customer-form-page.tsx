"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { useCustomers, useMembers } from "@/data/queries";
import { useCorrectCustomer, usePaymentSchemes, useSubmitCustomer, useUpdateCustomerDraft, useVipProducts, useDiscardCustomerDraft, useOperation } from "@/data/business-queries";
import type { Customer } from "@/modules/customers/types";
import { RadioCardField } from "@/shared/forms/modern";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { AdminPage } from "@/shared/components/admin";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import {
  AddressSection,
  AttributionSection,
  CertificationsSection,
  ContactSection,
  GovernmentIdSection,
  IdentitySection,
  SectionBlock,
  SupplementarySection,
  toDraft,
  toInput,
  type CustomerDraft,
  type CustomerErrors,
  type SetDraft,
} from "../components/customer-form-sections";
import { CustomerApplicationWizard } from "./customer-application-wizard";

export function CustomerFormPage({ customerId }: { customerId?: string }) {
  const customers = useCustomers();
  const existing = customerId ? customers.data?.find((item) => item.id === customerId) : undefined;
  const loading = Boolean(customerId) && customers.isLoading;
  return (
    <AdminPage anyOf={["customers"]} title={customerId ? "Edit customer" : "New customer"} description={customerId ? "VIP application details. A draft can be saved incomplete." : "Choose a VIP card, then complete the application."} crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customerId ? "Edit" : "New" }]}>
      {!customerId ? <CustomerApplicationWizard /> : loading ? <Skeleton className="tw:h-64 tw:w-full" /> : !existing ? <InfoNote title="Customer not found">This customer does not exist or is not visible to this account.</InfoNote> : <CustomerForm key={existing.id} existing={existing} />}
    </AdminPage>
  );
}

/** Single-page editor for an existing customer (draft or submitted correction). New applications use the wizard. */
function CustomerForm({ existing }: { existing: Customer }) {
  const router = useRouter();
  const canManage = useOperation("customers.manage");
  const products = useVipProducts();
  const schemes = usePaymentSchemes();
  const members = useMembers();
  const updateDraft = useUpdateCustomerDraft();
  const submit = useSubmitCustomer();
  const correct = useCorrectCustomer();
  const discard = useDiscardCustomerDraft();
  const [draft, setDraft] = useState<CustomerDraft>(() => toDraft(existing));
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const isDraft = existing.status === "draft";
  const set: SetDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const supplementaryAllowed = (products.data ?? []).some((product) => product.code === draft.vipPlan && product.supplementaryHolders > 0);

  const osts = (members.data ?? []).filter((member) => member.designation === "OST").map((member) => ({ value: member.id, label: member.displayName }));
  const sellers = (members.data ?? []).map((member) => ({ value: member.id, label: `${member.displayName} (${member.designation})` }));

  if (!canManage) return <InfoNote title="View only">This account cannot create or edit customers.</InfoNote>;

  const run = async (work: () => Promise<unknown>, success: string, then?: () => void) => {
    setBusy(true);
    try {
      await work();
      toast.success(success);
      then?.();
    } catch (failure) {
      if (failure instanceof CustomerValidationError) {
        setErrors(failure.errors);
        toast.error("Review the highlighted fields. Your draft was kept.");
      } else toast.error(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    setErrors({});
    return run(async () => {
      const input = toInput(draft);
      if (!input.displayName) throw new Error("Enter at least a first or last name to save a draft.");
      const saved = await updateDraft.mutateAsync({ id: existing.id, input });
      router.push(`/admin/customers/${saved.id}`);
    }, "Draft saved.");
  };

  const submitCustomer = () => {
    setErrors({});
    return run(async () => {
      await submit.mutateAsync({ id: existing.id, input: toInput(draft) });
      router.push(`/admin/customers/${existing.id}`);
    }, "Customer submitted.");
  };

  const schemeOptions = (schemes.data ?? []).map((scheme) => ({ value: scheme.id, label: scheme.commercialStatus === "configured" ? scheme.label : `${scheme.label} (terms pending)`, disabled: scheme.availability !== "available" }));
  const planOptions = (products.data ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.code, label: `${item.name} (${item.code})` }));

  return (
    <form
      className="customer-application tw:flex tw:flex-col tw:gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (isDraft) void submitCustomer();
        else setCorrecting(true);
      }}
    >
      {!isDraft ? <InfoNote title="Correcting a submitted customer">Changes are saved as an audited data correction with a reason.</InfoNote> : null}
      <SectionBlock title="VIP card and payment plan">
        <RadioCardField label="VIP card" required value={draft.vipPlan || undefined} options={planOptions} onChange={(value) => setDraft((current) => ({ ...current, vipPlan: value, ...((products.data ?? []).some((product) => product.code === value && product.supplementaryHolders > 0) ? {} : { suppFirstName: "", suppMiddleName: "", suppLastName: "", suppGender: "", suppDateOfBirth: "" }) }))} error={errors.vipPlan} />
        <RadioCardField label="Payment scheme" required variant="card" value={draft.paymentSchemeId || undefined} options={schemeOptions} onChange={(value) => set("paymentSchemeId", value)} error={errors.paymentSchemeId} />
        <RadioCardField label="Contract classification" required value={draft.contractClassification || undefined} options={[{ value: "S", label: "Standard (S)" }, { value: "N", label: "Non-Standard (N)" }]} onChange={(value) => set("contractClassification", value)} error={errors.contractClassification} hint="Non-Standard contracts are held at finalization until their rules are approved." />
      </SectionBlock>
      {supplementaryAllowed ? <SupplementarySection draft={draft} set={set} errors={errors} /> : null}
      <IdentitySection draft={draft} set={set} errors={errors} />
      <ContactSection draft={draft} set={set} errors={errors} />
      <AddressSection draft={draft} set={set} errors={errors} />
      <GovernmentIdSection draft={draft} set={set} errors={errors} />
      <AttributionSection draft={draft} set={set} errors={errors} osts={osts} sellers={sellers} showOwner={false} />
      <CertificationsSection draft={draft} set={set} errors={errors} />
      <div className="tw:flex tw:flex-col-reverse tw:gap-2 tw:sm:flex-row tw:sm:justify-end">
        <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => router.back()}>
          Cancel
        </Button>
        {isDraft ? (
          <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void run(() => discard.mutateAsync(existing.id), "Draft discarded.", () => router.push("/admin/customers"))}>
            Discard draft
          </Button>
        ) : null}
        {isDraft ? (
          <Button type="button" variant="outline" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => void saveDraft()}>
            Save as draft
          </Button>
        ) : null}
        <Button type="submit" disabled={busy} className="tw:min-h-11 tw:sm:min-h-8">
          {isDraft ? "Submit" : "Save correction"}
        </Button>
      </div>
      {!isDraft ? (
        <ReasonDialog
          open={correcting}
          title="Save data correction"
          description="Corrections to a submitted customer are audited. Explain what changed and why."
          confirmText="Save correction"
          successText="Correction saved."
          onClose={() => setCorrecting(false)}
          onSubmit={async (reason) => {
            try {
              await correct.mutateAsync({ id: existing.id, input: toInput(draft), reason });
              router.push(`/admin/customers/${existing.id}`);
            } catch (failure) {
              if (failure instanceof CustomerValidationError) {
                setErrors(failure.errors);
                setCorrecting(false);
              }
              throw failure;
            }
          }}
        />
      ) : null}
    </form>
  );
}
