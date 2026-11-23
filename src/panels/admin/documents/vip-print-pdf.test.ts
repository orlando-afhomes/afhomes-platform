// @vitest-environment node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PDFDocument, PDFPage } from "pdf-lib";
import type { PrintContract, PrintCustomer, TemplateKey } from "@/modules/contracts/print-data";
import type { Payment } from "@/modules/finance/types";
import { renderVipDocument } from "./vip-print-pdf";

const load = async (filename: string) => Uint8Array.from(await readFile(resolve(filename))).buffer;
const sources = {
  template: (key: TemplateKey) => load(`public/vip-print-templates/${key}.pdf`),
  fonts: () => Promise.all(["latin", "latin-ext"].map((subset) => load(`node_modules/@fontsource/noto-sans/files/noto-sans-${subset}-400-normal.woff`))),
};
const customer: PrintCustomer = {
  displayName: "Léa Peña",
  firstName: "Léa",
  lastName: "Peña",
  dateOfBirth: "1994-06-10",
  gender: "Female",
  citizenship: "Filipino",
  civilStatus: "Single",
  email: "sample@example.test",
  mobileNumber: "09170000000",
  address: { street: "10 Sampaguita Street", city: "Calauan", barangay: "Perez", province: "Laguna", postalCode: "4012" },
  acquisitionChannel: "Corporate",
  supplementaryHolder: { firstName: "Mario", lastName: "Peña", middleName: null, dateOfBirth: "1995-12-05", gender: "Male", suffix: null },
};
const date = "2026-11-23";
const payment: Payment = {
  id: "sample-receipt", purpose: "reservation", status: "verified", method: "Bank Transfer", amountCentavos: 1_000_000,
  contractId: "sample-contract", customerId: "sample-customer", saleId: "sample-sale", referenceNo: "SAMPLE-123",
  paidDate: date, verifiedDate: date, documentNo: "SAMPLE-123", evidenceFileName: null, adjustments: [],
  submittedBy: "clerk", verifiedBy: "finance", submittedAt: "2026-11-23T01:00:00Z",
  verifiedAt: "2026-11-23T02:00:00Z", decisionReason: null, history: [],
};
const tierContracts = [
  { code: "B1", price: 7_200_000, installment: 1_550_000 },
  { code: "S1", price: 24_000_000, installment: 5_750_000 },
  { code: "G1", price: 39_000_000, installment: 9_500_000 },
] as const;

function purchase(tier: (typeof tierContracts)[number]): PrintContract {
  return {
    productCode: tier.code, status: "finalized", classification: "S", schemeId: "scheme-installment-4m", schemeLabel: "Four-Month Installment",
    customerAccepted: true, createdAt: date, vipNumber: `26112300001${tier.code}T04S`, priceCentavos: tier.price,
    schedule: [
      { seq: 1, label: "Reservation fee", amountCentavos: 1_000_000, purpose: "reservation", dueDate: date },
      ...Array.from({ length: 4 }, (_, i) => ({ seq: i + 2, label: `MA${i + 1}`, amountCentavos: tier.installment, purpose: "installment" as const, dueDate: "2026-12-23" })),
    ],
  };
}

async function checkPdf(result: Awaited<ReturnType<typeof renderVipDocument>>, pages: number, height: number) {
  const pdf = await PDFDocument.load(result.bytes);
  expect(pdf.getPageCount()).toBe(pages);
  expect(pdf.getPages().every((page) => page.getWidth() === 612 && page.getHeight() === height)).toBe(true);
  // Optional visual QA output, using synthetic fixtures only.
  if (process.env.AFHOMES_PDF_QA_DIR) await writeFile(resolve(process.env.AFHOMES_PDF_QA_DIR, `${result.label}.pdf`), result.bytes);
}

describe("fixed-layout VIP print samples", () => {
  it("fills two application pages with separate Gold cardholder fields", async () => {
    await checkPdf(await renderVipDocument({
      kind: "application", customer, tierCode: "G1", schemeLabel: "Four-Month Installment", priceCentavos: 39_000_000, contacts: {}, date,
    }, sources), 2, 936);
  });

  it.each(tierContracts)("produces $code signing and Grant previews at source paper sizes", async (tier) => {
    const contract = purchase(tier);
    const data = { customer, contacts: { director: "Director Sample", manager: "Manager Sample", referrer: "Referrer Sample" }, payments: [payment], date };
    await checkPdf(await renderVipDocument({ ...data, kind: "reservation", contract: { ...contract, vipNumber: undefined } }, sources), 2, 936);
    await checkPdf(await renderVipDocument({ ...data, kind: "grant", contract }, sources), 9, tier.code === "B1" ? 1008 : 936);
  });

  it("stamps every page of every output as a sample", async () => {
    const contract = purchase(tierContracts[2]);
    const data = { customer, contacts: {}, payments: [payment], date };
    const draw = vi.spyOn(PDFPage.prototype, "drawText");
    const outputs = await Promise.all([
      renderVipDocument({ kind: "application", customer, tierCode: "G1", schemeLabel: "Four-Month Installment", priceCentavos: contract.priceCentavos, contacts: {}, date }, sources),
      renderVipDocument({ ...data, kind: "reservation", contract }, sources),
      renderVipDocument({ ...data, kind: "grant", contract }, sources),
      renderVipDocument({ kind: "finance", contract, payments: [payment], customerName: customer.displayName, date }, sources),
    ]);
    for (const output of outputs) {
      expect((await PDFDocument.load(output.bytes)).getPageCount()).toBeGreaterThan(0);
    }
    const stamped = draw.mock.calls.filter(([text]) => text === "SAMPLE - NOT FOR SIGNING").length;
    const total = (await Promise.all(outputs.map(async (output) => (await PDFDocument.load(output.bytes)).getPageCount()))).reduce((sum, count) => sum + count, 0);
    expect(stamped).toBe(total);
    draw.mockRestore();
  });

  it("reports excess text with the offending field name rather than clipping", async () => {
    const contract = purchase(tierContracts[0]);
    await expect(renderVipDocument({
      kind: "grant", contract, date, contacts: {}, payments: [], customer: { ...customer, firstName: "Very long given name ".repeat(45) },
    }, sources)).rejects.toThrow(/Primary cardholder name is too long/);
  });

  it("prints an exact appendix if the final installment or due day differs", async () => {
    const contract = purchase(tierContracts[0]);
    contract.classification = "N";
    contract.schedule[4] = { ...contract.schedule[4], dueDate: "2027-02-28", amountCentavos: 1_550_002 };
    contract.priceCentavos += 2;
    const result = await renderVipDocument({ kind: "reservation", contract, customer, date, contacts: {}, payments: [] }, sources);
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getPage(2).getSize()).toEqual({ width: 612, height: 936 });
  });

  it("renders a separate Finance summary including reversals", async () => {
    await checkPdf(await renderVipDocument({
      kind: "finance", contract: purchase(tierContracts[0]), date, customerName: customer.displayName,
      payments: [{ ...payment, adjustments: [{ id: "reversal", kind: "reversal", amountCentavos: 100_000, date, reason: "Sample correction", actorId: "finance" }] }],
    }, sources), 1, 936);
  });
});
