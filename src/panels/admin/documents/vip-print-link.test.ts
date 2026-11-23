import { describe, expect, it } from "vitest";
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
  it("keeps only copies that match the saved application", () => {
    const store = {};
    archiveFor(store).set("draft", [copy("old", application("0917")), copy("new", application("0918"))]);
    linkPreparedApplication(store, "draft", "c1", application("0918"));
    expect(archiveFor(store).get(applicationPrintKey("c1"))?.map((item) => item.id)).toEqual(["new"]);
    expect(archiveFor(store).has("draft")).toBe(false);
  });

  it("drops every copy when the saved application can no longer be printed", () => {
    const store = {};
    archiveFor(store).set("draft", [copy("old", application("0917"))]);
    linkPreparedApplication(store, "draft", "c1", undefined);
    expect(archiveFor(store).has(applicationPrintKey("c1"))).toBe(false);
    expect(archiveFor(store).has("draft")).toBe(false);
  });
});
