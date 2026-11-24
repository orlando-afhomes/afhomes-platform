import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildReportPdf } from "./report-pdf";

const font = (file: string) => new Uint8Array(readFileSync(`node_modules/@fontsource/noto-sans/files/${file}.woff`));
const assets = {
  logo: new Uint8Array(readFileSync("public/images/logo.png")),
  regular: [font("noto-sans-latin-400-normal"), font("noto-sans-latin-ext-400-normal")],
  bold: [font("noto-sans-latin-700-normal"), font("noto-sans-latin-ext-700-normal")],
};
const report = { title: "Collections Report", generated: "24 Nov 2026", metadata: ["Date range: 1 Nov to 24 Nov 2026"] };

describe("report PDF", () => {
  it("makes a portrait PDF for a report without rows", async () => {
    const pdf = await PDFDocument.load(await buildReportPdf({ ...report, columns: ["Customer", "Amount"], rows: [] }, assets));
    expect(pdf.getTitle()).toBe(report.title);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeLessThan(pdf.getPage(0).getHeight());
  });

  it("creates landscape pages for a wide, multi-page report with accented text and peso amounts", async () => {
    const columns = Array.from({ length: 13 }, (_, i) => `Column ${i + 1}`);
    const rows = Array.from({ length: 65 }, () => columns.map((_, i) => i === 0 ? "Peña · Łukasz" : "₱1,234.56"));
    const pdf = await PDFDocument.load(await buildReportPdf({ ...report, columns, rows }, assets));
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getPages().every((page) => page.getWidth() > page.getHeight())).toBe(true);
  });
});
