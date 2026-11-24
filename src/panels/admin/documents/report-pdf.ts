import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type ReportPdfData = {
  title: string;
  generated: string;
  metadata: readonly string[];
  columns: readonly string[];
  rows: readonly (readonly string[])[];
};

type Assets = { logo: Uint8Array; regular: Uint8Array[]; bold: Uint8Array[] };
type FontRun = { font: PDFFont; text: string };
const brand = rgb(23 / 255, 79 / 255, 59 / 255);
const ink = rgb(28 / 255, 43 / 255, 58 / 255);
const muted = rgb(64 / 255, 80 / 255, 95 / 255);
const pale = rgb(232 / 255, 241 / 255, 236 / 255);
const alternate = rgb(0.977, 0.975, 0.964);
const line = rgb(0.87, 0.86, 0.83);
const margin = 36;
const padding = 6;
const lineHeight = 12;
const fontSize = 9;

async function fetchAsset(url: string | URL): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The report PDF assets are unavailable. Try again.");
  return new Uint8Array(await response.arrayBuffer());
}

async function reportAssets(): Promise<Assets> {
  const [logo, regular, regularExtended, bold, boldExtended] = await Promise.all([
    fetchAsset("/images/logo.png"),
    fetchAsset(new URL("../../../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff", import.meta.url)),
    fetchAsset(new URL("../../../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", import.meta.url)),
    fetchAsset(new URL("../../../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff", import.meta.url)),
    fetchAsset(new URL("../../../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff", import.meta.url)),
  ]);
  return { logo, regular: [regular, regularExtended], bold: [bold, boldExtended] };
}

function textWriter(fonts: PDFFont[]) {
  const characterSets = fonts.map((font) => new Set(font.getCharacterSet()));
  const runs = (text: string): FontRun[] => {
    const result: FontRun[] = [];
    for (const character of text) {
      const font = fonts[characterSets.findIndex((set) => set.has(character.codePointAt(0)!))];
      if (!font) throw new Error("This report contains text that the PDF font cannot display. Excel and CSV can preserve it.");
      const last = result.at(-1);
      if (last?.font === font) last.text += character;
      else result.push({ font, text: character });
    }
    return result;
  };
  const width = (text: string, size: number) =>
    runs(text).reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0);

  function wrap(text: string, maxWidth: number, size: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = current ? `${current} ${word}` : word;
        if (width(next, size) <= maxWidth) {
          current = next;
          continue;
        }
        if (current) lines.push(current);
        current = "";
        if (width(word, size) <= maxWidth) {
          current = word;
          continue;
        }
        for (const character of word) {
          if (current && width(current + character, size) > maxWidth) {
            lines.push(current);
            current = "";
          }
          current += character;
        }
      }
      lines.push(current);
    }
    return lines;
  }

  function draw(page: PDFPage, text: string, x: number, y: number, size: number, color = ink) {
    for (const run of runs(text)) {
      page.drawText(run.text, { x, y, size, font: run.font, color });
      x += run.font.widthOfTextAtSize(run.text, size);
    }
  }

  return { width, wrap, draw };
}

function columnBands(columnCount: number, capacity: number): number[][] {
  const indexes = Array.from({ length: columnCount }, (_, index) => index);
  const bands = [indexes.slice(0, capacity)];
  for (let start = capacity; start < columnCount; start += capacity - 1) {
    bands.push([0, ...indexes.slice(start, start + capacity - 1)]);
  }
  return bands;
}

export async function buildReportPdf(data: ReportPdfData, assets?: Assets): Promise<Uint8Array> {
  if (!data.columns.length) throw new Error("This report does not have any columns.");
  const source = assets ?? await reportAssets();
  const pdf = await PDFDocument.create();
  pdf.setTitle(data.title);
  pdf.setCreator("AFhomes Management Platform");
  pdf.registerFontkit(fontkit);
  const logo = await pdf.embedPng(source.logo);
  const regular = textWriter(await Promise.all(source.regular.map((font) => pdf.embedFont(font, { subset: true }))));
  const bold = textWriter(await Promise.all(source.bold.map((font) => pdf.embedFont(font, { subset: true }))));
  const landscape = data.columns.length > 5;
  const pageSize: [number, number] = landscape ? [841.89, 595.28] : [595.28, 841.89];
  const [width, height] = pageSize;
  const contentWidth = width - margin * 2;
  const bands = columnBands(data.columns.length, Math.floor(contentWidth / 72));

  for (const [bandIndex, band] of bands.entries()) {
    const cellWidth = contentWidth / band.length;
    const headings = band.map((column) => bold.wrap(data.columns[column], cellWidth - padding * 2, fontSize));
    const headingHeight = Math.max(...headings.map((cell) => cell.length)) * lineHeight + padding * 2;
    let page: PDFPage;
    let y: number;

    function startPage() {
      page = pdf.addPage(pageSize);
      page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: brand });
      const mark = logo.scaleToFit(36, 36);
      page.drawImage(logo, { x: margin, y: height - 61, ...mark });
      bold.draw(page, "AFhomes", margin + 46, height - 42, 16, brand);
      regular.draw(page, "Management Platform", margin + 46, height - 55, 9, muted);

      y = height - 85;
      for (const title of bold.wrap(data.title, contentWidth, 18)) {
        bold.draw(page, title, margin, y, 18);
        y -= 23;
      }
      const count = new Intl.NumberFormat("en-PH").format(data.rows.length);
      const bandLabel = bands.length > 1 ? ` · Column group ${bandIndex + 1} of ${bands.length}` : "";
      const metadata = [`Generated: ${data.generated} (Manila) · ${count} ${data.rows.length === 1 ? "row" : "rows"}${bandLabel}`, ...data.metadata];
      for (const detail of metadata) {
        for (const text of regular.wrap(detail, contentWidth, fontSize)) {
          regular.draw(page, text, margin, y, fontSize, muted);
          y -= lineHeight;
        }
      }
      y -= 5;
      if (y - headingHeight < margin + lineHeight + padding * 2) throw new Error("The report header is too long for this page.");
      page.drawRectangle({ x: margin, y: y - headingHeight, width: contentWidth, height: headingHeight, color: pale });
      headings.forEach((cell, column) => cell.forEach((text, row) =>
        bold.draw(page, text, margin + column * cellWidth + padding, y - padding - fontSize - row * lineHeight, fontSize, brand)));
      y -= headingHeight;
    }

    startPage();
    if (!data.rows.length) regular.draw(page!, "No records match.", margin + padding, y! - 16, fontSize, muted);

    for (const [rowIndex, row] of data.rows.entries()) {
      const cells = band.map((column) => regular.wrap(row[column] || "", cellWidth - padding * 2, fontSize));
      const heightInLines = Math.max(...cells.map((cell) => cell.length));
      const remainingLines = () => Math.floor((y! - margin - padding * 2) / lineHeight);
      // Keep normal rows together. A row longer than a page continues at full size.
      if (heightInLines > remainingLines()) startPage();
      for (let offset = 0; offset < heightInLines;) {
        if (remainingLines() < 1) startPage();
        const linesHere = Math.min(remainingLines(), heightInLines - offset);
        const rowHeight = linesHere * lineHeight + padding * 2;
        if (rowIndex % 2 === 1) page!.drawRectangle({ x: margin, y: y! - rowHeight, width: contentWidth, height: rowHeight, color: alternate });
        cells.forEach((cell, column) => cell.slice(offset, offset + linesHere).forEach((text, index) =>
          regular.draw(page!, text, margin + column * cellWidth + padding, y! - padding - fontSize - index * lineHeight, fontSize)));
        y! -= rowHeight;
        page!.drawLine({ start: { x: margin, y: y! }, end: { x: width - margin, y: y! }, color: line, thickness: 0.45 });
        offset += linesHere;
      }
    }
  }

  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    const footer = `Page ${index + 1} of ${pages.length}`;
    regular.draw(page, footer, width - margin - regular.width(footer, fontSize), 19, fontSize, muted);
  });
  return pdf.save();
}
