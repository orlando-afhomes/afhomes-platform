"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Download, Printer } from "lucide-react";
import { useCustomers, useMembers } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { manilaToday } from "@/shared/lib/dates";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { canPrintGrant, printCustomerData, templateKeyFor, type PrintDocumentInput, type SaleContacts } from "@/modules/contracts/print-data";
import type { OrgMember } from "@/modules/organization/types";
import type { GenealogyEntry } from "@/modules/contracts/types";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";

type PreparedCopy = {
  id: string;
  at: string;
  input: PrintDocumentInput;
  revision: string;
  label: string;
  pdf: Blob;
  signed?: Blob;
};

// The provider owns a different store per browser session. Generated or signed PDFs reset with it.
const archives = new WeakMap<object, Map<string, PreparedCopy[]>>();
const timestamp = new Intl.DateTimeFormat("en-PH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Manila" });

export function archiveFor(store: object) {
  let archive = archives.get(store);
  if (!archive) {
    archive = new Map();
    archives.set(store, archive);
  }
  return archive;
}

export function applicationPrintKey(customerId: string) {
  return `application:${customerId}`;
}

// A copy printed before the applicant, card, plan, price or team changed no longer matches the saved record.
const applicationFingerprint = (input: PrintDocumentInput | undefined) =>
  input?.kind === "application" ? JSON.stringify([input.customer, input.tierCode, input.priceCentavos, input.schemeLabel, input.contacts]) : null;

export function linkPreparedApplication(store: object, draftKey: string, customerId: string, current?: PrintDocumentInput) {
  const archive = archiveFor(store);
  const key = applicationPrintKey(customerId);
  const copies = archive.get(draftKey);
  if (!copies || key === draftKey) return;
  const fingerprint = applicationFingerprint(current && "customer" in current ? { ...current, customer: printCustomerData(current.customer) } : current);
  const matching = copies.filter((copy) => fingerprint !== null && applicationFingerprint(copy.input) === fingerprint);
  if (matching.length) archive.set(key, [...(archive.get(key) ?? []), ...matching]);
  archive.delete(draftKey);
}

export function salePrintContacts(
  members: readonly OrgMember[],
  sellerId?: string | null,
  referrerId?: string | null,
  recordedTeam?: readonly GenealogyEntry[],
): SaleContacts {
  const team: { displayName: string; designation: string }[] = recordedTeam ? [...recordedTeam] : [];
  if (!recordedTeam) {
    const visited = new Set<string>();
    let current = members.find((member) => member.id === sellerId);
    while (current && !visited.has(current.id)) {
      team.push(current);
      visited.add(current.id);
      const parent = current.parentId;
      current = members.find((member) => member.id === parent);
    }
  }
  const referrer = members.find((member) => member.id === referrerId);
  return {
    director: team.find((entry) => entry.designation === "SVD")?.displayName,
    seniorManager: team.find((entry) => entry.designation === "SSM")?.displayName,
    manager: team.find((entry) => entry.designation === "SM")?.displayName,
    referrer: referrer?.displayName,
    referrerPhone: referrer?.sellerProfile?.mobileNumber,
    referrerEmail: referrer?.sellerProfile?.email,
  };
}

function downloadPdf(pdf: Blob, filename: string) {
  const location = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  link.href = location;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(location), 60_000);
}

function PrintPreview({ file, children }: { file: Blob; children: (url: string) => ReactNode }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const location = URL.createObjectURL(file);
    // The generated PDF exists only for the lifetime of this preview.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(location);
    return () => URL.revokeObjectURL(location);
  }, [file]);
  return url ? children(url) : null;
}

type PrintProps = {
  title: string;
  input?: PrintDocumentInput;
  archiveKey?: string;
  allowSignedSample?: boolean;
  currentVipNumber?: string;
};

export function VipPrintControl(props: PrintProps) {
  const { identity } = useDevIdentity();
  return <VipPrintSession key={identity.id} {...props} />;
}

function VipPrintSession({ title, input, archiveKey, allowSignedSample, currentVipNumber }: PrintProps) {
  const store = useMockStore();
  const attachId = useId();
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<PreparedCopy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const copies = archiveKey ? archiveFor(store).get(archiveKey) ?? [] : [];
  const generate = async () => {
    if (!input || running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const projected = "customer" in input ? { ...input, customer: printCustomerData(input.customer) } : input;
      const snapshot = structuredClone("payments" in projected ? {
        ...projected,
        payments: projected.payments.map((payment) => ({
          ...payment, evidenceFileDataUrl: undefined, evidenceFileName: null, history: [],
        })),
      } : projected);
      const { renderVipDocument } = await import("./vip-print-pdf");
      const document = await renderVipDocument(snapshot);
      const next: PreparedCopy = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        input: snapshot,
        revision: document.revision,
        label: document.label,
        pdf: new Blob([Uint8Array.from(document.bytes)], { type: "application/pdf" }),
      };
      if (archiveKey) {
        const archive = archiveFor(store);
        archive.set(archiveKey, [...(archive.get(archiveKey) ?? []), next]);
      }
      setCopy(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The PDF could not be prepared. Try again.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const attach = async (file: File | undefined) => {
    if (!file || !copy || !allowSignedSample || copy.signed || running.current) return;
    if ((file.type !== "application/pdf" && !(file.type === "" && /\.pdf$/i.test(file.name))) || file.size > 5 * 1024 * 1024) {
      setError("Choose a sample PDF no larger than 5 MB.");
      return;
    }
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      if (pdf.getPageCount() === 0) throw new Error("Empty PDF");
      const next = { ...copy, signed: file };
      if (archiveKey) {
        const archive = archiveFor(store);
        archive.set(archiveKey, (archive.get(archiveKey) ?? []).map((item) => item.id === next.id ? next : item));
      }
      setCopy(next);
    } catch {
      setError("This sample PDF could not be opened. Choose a readable PDF.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  if (!input && copies.length === 0) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (next || !running.current) setOpen(next);
    }}>
      <Button variant="info" onClick={() => {
        setOpen(true);
        setError("");
        setCopy(copies.at(-1) ?? null);
        if (copies.length === 0) void generate();
      }}><Printer aria-hidden="true" />{title}</Button>
      <DialogContent showCloseButton={!busy} className="tw:sm:max-w-4xl tw:max-h-[94dvh] tw:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Sample PDF for review. The print command is available in the PDF viewer.</DialogDescription>
        </DialogHeader>
        {copies.length > 1 ? (
          <div className="tw:flex tw:flex-wrap tw:gap-2" aria-label="Prepared copies">
            {copies.map((item, index) => (
              <Button key={item.id} variant={copy?.id === item.id ? "secondary" : "outline"} size="sm" disabled={busy} onClick={() => {
                setError("");
                setCopy(item);
              }}>Copy {index + 1} · {timestamp.format(new Date(item.at))}</Button>
            ))}
          </div>
        ) : null}
        {error ? <p role="alert" className="tw:text-destructive">{error}</p> : null}
        {busy ? <p role="status">Preparing PDF…</p> : null}
        {copy ? <PrintPreview key={copy.id} file={copy.pdf}>{(url) => (
          <>
            <iframe src={url} title={title + " preview"} className="tw:h-[55dvh] tw:w-full tw:rounded-md tw:border" />
            <p className="tw:text-xs tw:text-muted-foreground">{copy.revision} · {timestamp.format(new Date(copy.at))}</p>
            {currentVipNumber ? <p className="tw:text-xs tw:text-muted-foreground">Linked purchase VIP Number: {currentVipNumber}</p> : null}
            {allowSignedSample && archiveKey ? (
              copy.signed ? (
                <Button variant="outline" onClick={() => downloadPdf(copy.signed!, "afhomes-signed-sample.pdf")}>Download attached signed sample</Button>
              ) : (
                <div className="tw:grid tw:gap-1">
                  <label htmlFor={attachId}>Attach signed sample PDF to this copy</label>
                  <Input id={attachId} type="file" accept="application/pdf" disabled={busy} onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void attach(file);
                  }} />
                </div>
              )
            ) : null}
            <DialogFooter>
              {input && archiveKey ? <Button variant="outline" onClick={generate} disabled={busy}>Prepare new sample</Button> : null}
              <a className={buttonVariants({ variant: "outline" })} href={url} target="_blank" rel="noreferrer">Open PDF to print</a>
              <a className={buttonVariants({ variant: "info" })} href={url} download={`afhomes-${copy.label}-sample.pdf`}><Download aria-hidden="true" />Download PDF</a>
            </DialogFooter>
          </>
        )}</PrintPreview> : null}
        {!copy && !busy && input ? <DialogFooter><Button onClick={generate}>Try again</Button></DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export function ContractPrintControls({ contract, payments, referrerId }: { contract: ContractView; payments: PaymentView[]; referrerId?: string | null }) {
  const customers = useCustomers();
  const members = useMembers();
  const customer = customers.data?.find((item) => item.id === contract.customerId && !item.restricted);
  if (!customer) return null;
  const available = Boolean(templateKeyFor("reservation", contract) && contract.schedule.length && contract.priceCentavos > 0 && contract.status !== "cancelled");
  const grant = canPrintGrant(contract);
  const contacts = salePrintContacts(members.data ?? [], contract.sellerMemberId, referrerId, contract.genealogy);
  const data = { customer, contract, payments, contacts, date: manilaToday() };
  return (
    <div className="tw:space-y-2">
      <div className="tw:flex tw:flex-wrap tw:gap-2">
        <VipPrintControl title="Print Reservation Agreement" archiveKey={`reservation:${contract.id}`} input={available ? { kind: "reservation", ...data } : undefined} allowSignedSample={Boolean(contract.signedAgreementRecordedDate)} currentVipNumber={contract.vipNumber} />
        <VipPrintControl title="Print VIP Grant" archiveKey={`grant:${contract.id}`} input={grant ? { kind: "grant", ...data } : undefined} allowSignedSample={grant} />
      </div>
      {contract.status === "finalized" && contract.vipNumber && !grant ? (
        <InfoNote title="Grant template unavailable">This tier and payment schedule need a matching Grant template.</InfoNote>
      ) : null}
      {contract.status === "finalized" && !contract.vipNumber ? (
        <InfoNote title="VIP Grant not available yet">The VIP Grant is available once the VIP Number is issued after the qualifying payment.</InfoNote>
      ) : null}
    </div>
  );
}

export function FinancePrintControl({ contract, payments }: { contract: ContractView; payments: PaymentView[] }) {
  if (!payments.some((payment) => payment.status === "verified")) return null;
  return <VipPrintControl title="Print Finance Summary" input={{ kind: "finance", contract, payments, customerName: contract.customerName, date: manilaToday() }} />;
}

export function ApplicationReprint({ customerId }: { customerId: string }) {
  return <VipPrintControl title="Print filed application sample" archiveKey={applicationPrintKey(customerId)} allowSignedSample />;
}
