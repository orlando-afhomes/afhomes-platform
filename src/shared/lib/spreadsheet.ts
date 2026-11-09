"use client";

/**
 * Browser spreadsheet helpers for import and export. The XLSX libraries are
 * loaded on demand so they stay out of the main bundle. Files are read in the
 * browser only; nothing is uploaded or stored.
 */
import { parseCsv } from "@/modules/customers/import";

export const SPREADSHEET_ACCEPT = ".xlsx,.csv";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Reads the named sheet (or the first sheet) of an .xlsx file, or a .csv file, as rows of cells. */
export async function readSpreadsheet(file: File, preferredSheet: string): Promise<unknown[][]> {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than 10 MB.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if (!name.endsWith(".xlsx")) throw new Error("Upload an .xlsx or .csv file.");
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  try {
    const sheets = await readXlsxFile(file);
    const sheet = sheets.find((item) => item.sheet.toLowerCase() === preferredSheet.toLowerCase()) ?? sheets[0];
    if (!sheet) throw new Error("The workbook has no sheets.");
    return sheet.data as unknown[][];
  } catch (error) {
    throw new Error(error instanceof Error && error.message ? `The workbook could not be read: ${error.message}` : "The workbook could not be read.");
  }
}

/** Writes text-only sheets to an .xlsx download. Every cell is a string, so nothing is evaluated as a formula. */
export async function downloadXlsx(fileName: string, sheets: Array<{ name: string; rows: string[][] }>): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  await writeXlsxFile(
    sheets.map((sheet) => ({ sheet: sheet.name, data: sheet.rows.map((row, index) => row.map((value) => ({ value, type: String, fontWeight: index === 0 ? ("bold" as const) : undefined }))) })),
  ).toFile(fileName);
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV download with a UTF-8 BOM so spreadsheet apps keep accented names. */
export function downloadCsv(fileName: string, rows: string[][]): void {
  const text = `﻿${rows.map((row) => row.map(csvField).join(",")).join("\r\n")}\r\n`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
