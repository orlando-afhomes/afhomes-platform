import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { buildCollectionLedger } from "@/modules/finance/rules";
import { firstPaymentSummary, printHolderName, printHomeAddress, supportedPrintTier, templateKeyFor, canPrintGrant, type PrintCustomer, type PrintDocumentInput, type TemplateKey } from "@/modules/contracts/print-data";

export const TEMPLATE_REVISIONS = {
  application: "VPCAF 1.6 · 2026-09-25",
  "reservation-bronze": "Bronze RA · supplied template",
  "reservation-silver": "Silver RA · supplied template",
  "reservation-gold": "Gold RA · supplied template",
  "grant-bronze": "Bronze standard pricing · supplied Grant",
  "grant-silver": "Silver standard pricing · supplied Grant",
  "grant-gold": "Gold standard pricing · supplied Grant",
} satisfies Record<TemplateKey, string>;

const ink = rgb(0.08, 0.14, 0.19);
const white = rgb(1, 1, 1);
const money = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);
const displayDate = (date: string | null | undefined) => date ? date.replace(/^(\d{4})-(\d\d)-(\d\d)$/, "$2/$3/$1") : "";
const showDate = (date: string | null | undefined) => displayDate(date) || "—";
type Sources = { template(key: TemplateKey): Promise<ArrayBuffer>; fonts(): Promise<ArrayBuffer[]> };

async function loadAsset(url: string | URL) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The print assets are unavailable. Try again.");
  return response.arrayBuffer();
}

const browserSources: Sources = {
  template: (key) => loadAsset(`/vip-print-templates/${key}.pdf`),
  fonts: () => Promise.all([
    loadAsset(new URL("../../../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff", import.meta.url)),
    loadAsset(new URL("../../../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", import.meta.url)),
  ]),
};

function fontRuns(text: string, fonts: { font: PDFFont; characters: Set<number> }[], label: string) {
  const runs: { font: PDFFont; text: string }[] = [];
  for (const character of text) {
    const font = fonts.find((candidate) => candidate.characters.has(character.codePointAt(0)!))?.font;
    if (!font) throw new Error(`${label} contains a character this template cannot print.`);
    const previous = runs.at(-1);
    if (previous?.font === font) previous.text += character;
    else runs.push({ font, text: character });
  }
  return runs;
}

function pageWriter(fonts: PDFFont[]) {
  const typefaces = fonts.map((font) => ({ font, characters: new Set(font.getCharacterSet()) }));
  const widthOf = (text: string, size: number, label: string) =>
    fontRuns(text, typefaces, label).reduce((total, run) => total + run.font.widthOfTextAtSize(run.text, size), 0);

  return {
    put(page: PDFPage, x: number, bottom: number, width: number, value: string | null | undefined, label: string, size = 8) {
      const text = (value ?? "").replace(/\s+/g, " ").trim();
      const runs = fontRuns(text, typefaces, label);
      const widthAtSize = widthOf(text, size, label);
      const fitted = widthAtSize > width ? size * width / widthAtSize : size;
      if (fitted < 6) throw new Error(`${label} is too long for its space on the form. Review the source record before printing.`);
      let left = x;
      for (const run of runs) {
        page.drawText(run.text, { x: left, y: page.getHeight() - bottom, size: fitted, font: run.font, color: ink });
        left += run.font.widthOfTextAtSize(run.text, fitted);
      }
    },
    cover(page: PDFPage, x: number, top: number, width: number, height: number) {
      page.drawRectangle({ x, y: page.getHeight() - top - height, width, height, color: white });
    },
    wrap(value: string, width: number, maxLines: number, label: string, size = 8) {
      const lines: string[] = [];
      for (const word of value.trim().split(/\s+/)) {
        const line = lines.at(-1);
        if (line && widthOf(`${line} ${word}`, size, label) <= width) lines[lines.length - 1] = `${line} ${word}`;
        else lines.push(word);
      }
      if (lines.length > maxLines) throw new Error(`${label} is too long for its space on the form. Review the source record before printing.`);
      return lines;
    },
  };
}

type Writer = ReturnType<typeof pageWriter>;

function ageAt(birthday: string | null | undefined, date: string): string {
  if (!birthday || birthday > date) return "";
  return String(Number(date.slice(0, 4)) - Number(birthday.slice(0, 4)) - Number(date.slice(5) < birthday.slice(5)));
}

function fillApplication(writer: Writer, pages: PDFPage[], input: Extract<PrintDocumentInput, { kind: "application" }>) {
  const { customer, tierCode, contacts, date } = input;
  const page = pages[0];
  const fillHolder = (holder: PrintCustomer | NonNullable<PrintCustomer["supplementaryHolder"]>, offset: number) => {
    const put = (x: number, y: number, width: number, text: string | null | undefined, label: string) => writer.put(page, x, y + offset, width, text, label);
    put(24, 136, 556, printHolderName(holder, true), "Cardholder name");
    const demography = [
      [24, 104, displayDate(holder.dateOfBirth), "Date of birth"], [135, 88, ageAt(holder.dateOfBirth, date), "Age"],
      [231, 87, holder.gender, "Sex"], [327, 116, holder.citizenship, "Citizenship"], [454, 130, holder.civilStatus, "Civil status"],
    ] as const;
    for (const [x, width, text, label] of demography) put(x, 163, width, text, label);
    writer.wrap(printHomeAddress(holder), 555, 2, "Permanent address").forEach((line, index) => put(24, index ? 216 : 190, 555, line, "Permanent address"));
    for (const [x, width, text, label] of [
      [24, 198, holder.landline, "Landline"], [231, 86, holder.mobileNumber, "Mobile number"],
      [327, 118, holder.email, "Email"], [454, 131, holder.tinNumber, "TIN"],
    ] as const) put(x, 246, width, text, label);
    put(24, 274, 198, holder.occupation, "Occupation or business");
    const office = holder.officeAddress;
    put(232, 274, 352, office ? [office.street, office.municipality, office.province, office.postalCode].filter(Boolean).join(", ") : "", "Office address");
    put(24, 299, 198, holder.businessIndustry, "Business industry");
    put(232, 299, 352, holder.employedPosition, "Position");
  };
  fillHolder(customer, 0);
  const secondary = tierCode === "G1" ? customer.supplementaryHolder : null;
  if (secondary) fillHolder(secondary, 212);
  const marker = tierCode === "B1" ? 242 : tierCode === "S1" ? 361 : 499;
  writer.put(page, marker, 549, 7, "x", "Tier", 7);
  writer.put(page, 24, 576, 198, input.schemeLabel, "Payment terms");
  writer.put(page, 232, 576, 211, money(input.priceCentavos), "Card price");
  writer.put(page, 24, 621, 105, contacts.manager, "Sales manager");
  writer.put(page, 134, 612, 185, contacts.referrer, "VIP recommender");
  writer.put(page, 327, 621, 118, contacts.referrerPhone, "Recommender phone");
  writer.put(page, 454, 621, 133, contacts.referrerEmail, "Recommender email");
  const marks: Partial<Record<NonNullable<PrintCustomer["acquisitionChannel"]>, [number, number]>> = {
    CMP: [33, 653], Corporate: [153, 653], "Public Servant": [273, 653], "FB Ads": [447, 662],
    DRP: [33, 672], "Walk-In": [153, 672], Referral: [273, 672],
  };
  const channel = customer.acquisitionChannel;
  const mark = channel ? marks[channel] : null;
  if (mark) writer.put(page, ...mark, 8, "x", "Acquisition channel");
  if (channel === "GDP") writer.put(page, 454, 576, 130, "Channel: GDP", "Acquisition channel");
  for (const [signaturePage, baseline] of [[page, 769], [pages[1], 611]] as const) {
    writer.put(signaturePage, 73, baseline, 220, printHolderName(customer), "Primary printed name");
    if (secondary) writer.put(signaturePage, 340, baseline, 220, printHolderName(secondary), "Supplementary printed name");
  }
}

type ContractDocument = Extract<PrintDocumentInput, { kind: "reservation" | "grant" }>;

function fillReservation(pdf: PDFDocument, writer: Writer, { contract, customer, contacts, payments, date }: ContractDocument) {
  const [page, terms] = pdf.getPages();
  const fill = writer.put.bind(writer, page);
  const putMoney = (x: number, y: number, width: number, amount: number, label: string) => fill(x, y, width, money(amount), label);
  const summary = firstPaymentSummary(contract, payments, date);
  const reservation = contract.schedule.find((line) => line.purpose === "reservation");
  const down = contract.schedule.find((line) => line.purpose === "down_payment");
  const installments = contract.schedule.filter((line) => line.purpose === "installment");
  const first = installments[0];
  const last = installments.at(-1);
  const consistentAmount = installments.every((line) => line.amountCentavos === first?.amountCentavos);
  const consistentDay = installments.every((line) => line.dueDate?.slice(-2) === first?.dueDate?.slice(-2));
  fill(525, 140, 52, displayDate(date), "Prepared date", 7);
  fill(163, 154, 157, displayDate(reservation?.dueDate ?? contract.createdAt), "Reservation date");
  fill(440, 155, 125, contract.vipNumber ?? "Pending issuance", "VIP Number");
  putMoney(162, 202, 108, summary.reservationReceived, "Approved reservation amount");
  putMoney(162, 214, 108, summary.downPaymentReceived, "Approved down payment");
  putMoney(162, 226, 108, summary.received, "Total approved payment");
  if (summary.approved.length === 1) {
    const receipt = summary.approved[0];
    if (summary.reservationReceived) fill(399, 202, 112, displayDate(receipt.paidDate), "Reservation payment date");
    if (summary.downPaymentReceived) fill(399, 214, 112, displayDate(receipt.paidDate), "Down payment date");
    fill(399, 226, 112, receipt.method, "Payment method");
    fill(399, 237, 112, receipt.documentNo ?? receipt.referenceNo, "Receipt reference");
  } else if (summary.approved.length > 1) {
    fill(399, 237, 140, "See Finance payment summary", "Receipt reference");
  }
  const supplementary = contract.productCode === "G1" ? customer.supplementaryHolder : null;
  const fillHolder = (holder: PrintCustomer | NonNullable<PrintCustomer["supplementaryHolder"]>, offset: number) => {
    fill(164, 278 + offset, 375, printHolderName(holder), "Cardholder name");
    fill(164, 290 + offset, 375, printHomeAddress(holder), "Address");
    fill(164, 301 + offset, 240, holder.mobileNumber ?? holder.landline, "Contact");
    fill(164, 313 + offset, 136, holder.email, "Email");
    fill(354, 313 + offset, 166, holder.tinNumber, "TIN");
  };
  fillHolder(customer, 0);
  if (supplementary) fillHolder(supplementary, 77);
  putMoney(164, 548, 130, contract.priceCentavos, "Total price");
  putMoney(200, 602, 91, contract.priceCentavos, "Scheduled total");
  if (reservation) putMoney(200, 613, 91, reservation.amountCentavos, "Scheduled reservation fee");
  fill(319, 613, 88, displayDate(reservation?.dueDate), "Reservation due date");
  if (down) putMoney(200, 644, 91, down.amountCentavos, "Scheduled down payment");
  fill(319, 644, 88, displayDate(down?.dueDate), "Down payment due date");
  putMoney(200, 671, 91, contract.priceCentavos - (reservation?.amountCentavos ?? 0) - (down?.amountCentavos ?? 0), "Scheduled balance");
  if (first) {
    fill(158, 680, 34, String(installments.length), "Installment count", 7);
    if (consistentAmount) putMoney(200, 686, 91, first.amountCentavos, "Monthly installment");
    else fill(200, 686, 91, "See attached schedule", "Monthly installment");
    fill(533, 681, 43, displayDate(first.dueDate), "First installment due date", 7);
    fill(533, 692, 43, displayDate(last?.dueDate), "Last installment due date", 7);
    if (consistentDay) fill(414, 703, 37, first.dueDate?.slice(-2), "Due day", 7);
    else fill(414, 645, 163, "See attached schedule for due dates", "Due-date schedule");
  }
  const spotCash = contract.schedule.find((line) => line.purpose === "full");
  fill(319, 671, 89, displayDate(spotCash?.dueDate), "Balance due date");
  fill(414, 602, 163, contract.schemeLabel, "Payment plan");
  for (const [signaturePage, baseline] of [[page, 845], [terms, 753]] as const) {
    writer.put(signaturePage, 40, baseline, 245, printHolderName(customer), "Primary printed name");
    if (supplementary) writer.put(signaturePage, 328, baseline, 245, printHolderName(supplementary), "Supplementary printed name");
  }
  writer.put(terms, 164, 843, 149, contacts.director, "Sales Vice Director");
  writer.put(terms, 164, 854, 149, contacts.seniorManager, "Senior Sales Manager");
  writer.put(terms, 164, 865, 149, contacts.manager, "Sales Manager");
  writer.put(terms, 406, 843, 170, contacts.referrer, "Referrer");
  writer.put(terms, 406, 854, 170, contacts.referrer, "VIP Recommender");
  if (!consistentAmount || !consistentDay) {
    const schedule = pdf.addPage([612, 936]);
    writer.put(schedule, 42, 63, 528, "Reservation Agreement · Payment schedule", "Schedule title", 15);
    writer.put(schedule, 42, 85, 528, printHolderName(customer), "Buyer name", 10);
    writer.put(schedule, 42, 105, 528, `VIP Number: ${contract.vipNumber ?? "Pending issuance"}`, "Schedule VIP Number");
    writer.put(schedule, 42, 134, 200, "Scheduled payment", "Schedule heading", 9);
    writer.put(schedule, 294, 134, 125, "Due date", "Due-date heading", 9);
    writer.put(schedule, 442, 134, 125, "Amount", "Amount heading", 9);
    contract.schedule.forEach((line, index) => {
      const y = 157 + 18 * index;
      writer.put(schedule, 42, y, 235, line.label, "Scheduled payment");
      writer.put(schedule, 294, y, 125, showDate(line.dueDate), "Scheduled date");
      writer.put(schedule, 442, y, 125, money(line.amountCentavos), "Scheduled amount");
    });
  }
}

const grantCoordinates = {
  B1: { acceptance: [4, 546], signature: [6, 587], signingDate: 467, annex: [7, 407] },
  S1: { acceptance: [5, 115], signature: [7, 302], signingDate: 182, annex: [8, 331] },
  G1: { acceptance: [5, 196], signature: [7, 392], signingDate: 272, annex: [8, 331] },
} as const;

function fillGrant(writer: Writer, pages: PDFPage[], { contract, customer }: ContractDocument) {
  const tier = contract.productCode as keyof typeof grantCoordinates;
  const coordinates = grantCoordinates[tier];
  const name = printHolderName(customer);
  const address = printHomeAddress(customer);
  const [acceptance, acceptanceTop] = coordinates.acceptance;
  const [signature, signatureTop] = coordinates.signature;
  const [annex, annexTop] = coordinates.annex;
  const inline = (page: PDFPage, x: number, top: number, width: number, height: number, value: string, label: string) => {
    writer.cover(page, x, top - 1, width, height);
    writer.put(page, x + 1, top + 9, width - 3, value, label, 9);
  };
  const signers = pages[signature];
  writer.put(pages[0], 74, 175, 463, `VIP Number: ${contract.vipNumber}`, "VIP Number", 10);
  writer.put(pages[annex], 73, 118, 440, `VIP Number: ${contract.vipNumber}`, "Annex VIP Number");
  // Replace only the inline placeholders. The surrounding grant language remains on the supplied pages.
  inline(pages[0], 125, 340, 209, 13, name, "Primary cardholder name");
  inline(pages[0], 169, 356, 250, 13, address, "Primary cardholder address");
  inline(pages[acceptance], 81, acceptanceTop, 213, 13, name, "Primary cardholder name");
  inline(pages[acceptance], 121, acceptanceTop + 16, 252, 13, address, "Primary cardholder address");
  inline(signers, 319, signatureTop, 208, 14, name, "Primary printed name");
  // Leave execution date blank for the signer and retain the template's signing location.
  inline(signers, 410, coordinates.signingDate, 62, 13, "________", "Signing day");
  inline(signers, 499, coordinates.signingDate, 42, 13, "", "Signing month placeholder");
  inline(signers, 71, coordinates.signingDate + 16, 83, 13, "____________", "Signing month and year");
  if (tier === "G1") inline(signers, 201, 524, 245, 14, customer.supplementaryHolder ? printHolderName(customer.supplementaryHolder) : "Not designated", "Supplementary printed name");
  const dateLeft = tier === "B1" ? 462 : tier === "S1" ? 477 : 491;
  contract.schedule.forEach((line, index) => {
    inline(pages[annex], dateLeft, annexTop + index * 34, 67, 14, showDate(line.dueDate), "Annex payment due date");
  });
}

function financeSummary(pdf: PDFDocument, writer: Writer, input: Extract<PrintDocumentInput, { kind: "finance" }>) {
  const { contract, payments, date } = input;
  const rows = buildCollectionLedger(contract, payments);
  const items = new Map(payments.map((payment) => [payment.id, payment]));
  const summary = firstPaymentSummary(contract, payments, date);
  const heading = (number: number) => {
    const page = pdf.addPage([612, 936]);
    writer.put(page, 42, 38, 525, "FINANCE PAYMENT SUMMARY", "Summary title", 15);
    writer.put(page, 42, 63, 525, input.customerName, "Buyer", 12);
    writer.put(page, 42, 83, 525, `VIP Number: ${contract.vipNumber ?? "Pending issuance"}   |   As of: ${displayDate(date)}`, "Summary date", 9);
    writer.put(page, 42, 103, 525, `Agreed price: ${money(contract.priceCentavos)}   |   Net approved: ${money(summary.received)}   |   Balance: ${money(summary.balance)}`, "Totals", 9);
    for (const [x, width, label] of [[42, 72, "Paid / adjusted"], [118, 126, "Event or method"], [248, 128, "Receipt reference"], [381, 82, "Amount"], [475, 93, "Balance"]] as const) {
      writer.put(page, x, 130, width, label, "Column label", 9);
    }
    writer.put(page, 42, 907, 525, `AFHomes · Payment summary · Page ${number}`, "Page number");
    return page;
  };
  let pageNumber = 1;
  let page = heading(pageNumber);
  let y = 151;
  for (const row of rows) {
    if (y > 880) {
      page = heading(++pageNumber);
      y = 151;
    }
    const receipt = items.get(row.paymentId);
    writer.put(page, 42, y, 72, showDate(row.kind === "payment" ? receipt?.paidDate ?? row.date : row.date), "Payment date");
    writer.put(page, 118, y, 126, row.kind === "payment" ? receipt?.method : row.kind === "reversal" ? "Reversal" : "Refund", "Payment event");
    writer.put(page, 248, y, 128, receipt?.documentNo ?? receipt?.referenceNo, "Receipt number");
    writer.put(page, 381, y, 82, money(row.amountCentavos), "Amount");
    writer.put(page, 475, y, 93, money(row.balanceCentavos), "Balance");
    y += 18;
  }
}

export async function renderVipDocument(input: PrintDocumentInput, sources: Sources = browserSources) {
  if (input.kind === "application" && !supportedPrintTier(input.tierCode)) throw new Error("The application form has no selection for this card level.");
  const key = input.kind === "application" ? "application" : input.kind === "finance" ? null : templateKeyFor(input.kind, input.contract);
  if (input.kind === "grant" && !canPrintGrant(input.contract)) throw new Error("A finalized, numbered contract with a matching Grant template is required.");
  if (input.kind !== "finance" && !key) throw new Error("No template matches this contract.");
  const [pdf, fonts] = await Promise.all([key ? sources.template(key).then((bytes) => PDFDocument.load(bytes)) : PDFDocument.create(), sources.fonts()]);
  pdf.registerFontkit(fontkit);
  const embedded = await Promise.all(fonts.map((font) => pdf.embedFont(font, { subset: true })));
  const writer = pageWriter(embedded);
  if (input.kind === "application") fillApplication(writer, pdf.getPages(), input);
  else if (input.kind === "reservation") fillReservation(pdf, writer, input);
  else if (input.kind === "grant") fillGrant(writer, pdf.getPages(), input);
  else if (input.kind === "finance") financeSummary(pdf, writer, input);
  pdf.setTitle(`AFHomes ${input.kind}`);
  return { bytes: await pdf.save(), revision: key ? TEMPLATE_REVISIONS[key] : "Finance summary 1", label: key ?? "finance-summary" };
}
