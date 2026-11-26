import { beforeEach, describe, expect, it } from "vitest";
import { printCustomerData, type PrintDocumentInput } from "@/modules/contracts/print-data";
import { applicationPrintKey, archiveFor, linkPreparedApplication } from "./vip-print-controls";

const application = (mobileNumber: string): Extract<PrintDocumentInput, { kind: "application" }> => ({
  kind: "application", tierCode: "B1", priceCentavos: 7_200_000, schemeLabel: "Spot Cash", contacts: {}, date: "2026-11-23",
  customer: { displayName: "Test Sampleton", firstName: "Test", lastName: "Sampleton", mobileNumber },
});
// The print dialog stores the projected customer, so stored copies are projected the same way.
const printed = (input: ReturnType<typeof application>) => ({ ...input, customer: printCustomerData(input.customer) });
const copy = (id: string, input: ReturnType<typeof application>) => ({ id, at: "2026-11-23T00:00:00Z", input: printed(input), revision: "r", label: "application", pdf: new Blob() });

describe("linking a prepared application to its saved customer", () => {
  beforeEach(() => archiveFor().clear());

  it("keeps only copies that match the saved application", () => {
    archiveFor().set("draft", [copy("old", application("0917")), copy("new", application("0918"))]);
    linkPreparedApplication("draft", "c1", application("0918"));
    expect(archiveFor().get(applicationPrintKey("c1"))?.map((item) => item.id)).toEqual(["new"]);
    expect(archiveFor().has("draft")).toBe(false);
  });

  it("drops every copy when the saved application can no longer be printed", () => {
    archiveFor().set("draft", [copy("old", application("0917"))]);
    linkPreparedApplication("draft", "c1", undefined);
    expect(archiveFor().has(applicationPrintKey("c1"))).toBe(false);
    expect(archiveFor().has("draft")).toBe(false);
  });
});
