import type { TemplateKey } from "./print-data";

/** Printable form and card designs. The supplied PDF assets are filled by code; this registry is the confirmed revision record. */
export type PrintTemplateKind = "application" | "reservation" | "grant" | "card";

export type PrintTemplateDefinition = {
  key: TemplateKey | "vip-card";
  name: string;
  kind: PrintTemplateKind;
  revision: string;
  /** Asset path for a supplied PDF form; null for a design rendered by the app. */
  assetPath: string | null;
};

export const PRINT_TEMPLATES: readonly PrintTemplateDefinition[] = [
  { key: "application", name: "VIP Card Application Form", kind: "application", revision: "VPCAF 1.6 · 2026-09-25", assetPath: "/vip-print-templates/application.pdf" },
  { key: "reservation-bronze", name: "Bronze Reservation Agreement", kind: "reservation", revision: "Bronze RA · supplied template", assetPath: "/vip-print-templates/reservation-bronze.pdf" },
  { key: "reservation-silver", name: "Silver Reservation Agreement", kind: "reservation", revision: "Silver RA · supplied template", assetPath: "/vip-print-templates/reservation-silver.pdf" },
  { key: "reservation-gold", name: "Gold Reservation Agreement", kind: "reservation", revision: "Gold RA · supplied template", assetPath: "/vip-print-templates/reservation-gold.pdf" },
  { key: "grant-bronze", name: "Bronze VIP Grant", kind: "grant", revision: "Bronze standard pricing · supplied Grant", assetPath: "/vip-print-templates/grant-bronze.pdf" },
  { key: "grant-silver", name: "Silver VIP Grant", kind: "grant", revision: "Silver standard pricing · supplied Grant", assetPath: "/vip-print-templates/grant-silver.pdf" },
  { key: "grant-gold", name: "Gold VIP Grant", kind: "grant", revision: "Gold standard pricing · supplied Grant", assetPath: "/vip-print-templates/grant-gold.pdf" },
  { key: "vip-card", name: "VIP Card", kind: "card", revision: "Supplied VIP card design", assetPath: null },
];

export const TEMPLATE_REVISIONS = {
  application: "VPCAF 1.6 · 2026-09-25",
  "reservation-bronze": "Bronze RA · supplied template",
  "reservation-silver": "Silver RA · supplied template",
  "reservation-gold": "Gold RA · supplied template",
  "grant-bronze": "Bronze standard pricing · supplied Grant",
  "grant-silver": "Silver standard pricing · supplied Grant",
  "grant-gold": "Gold standard pricing · supplied Grant",
} satisfies Record<TemplateKey, string>;
