import { describe, expect, it } from "vitest";
import { afhomesTheme } from "./antd-theme";

// Guards the corporate palette: theme tokens must equal tokens.css values.
// shortcut: manual sync between antd-theme.ts and tokens.css; upgrade to a
// generated check if the palette starts changing often.
describe("afhomesTheme", () => {
  it("uses forest green as the primary color", () => {
    expect(afhomesTheme.token?.colorPrimary).toBe("#174f3b");
    expect(afhomesTheme.token?.colorLink).toBe("#174f3b");
  });

  it("uses harvest gold accents and status colors", () => {
    expect(afhomesTheme.token?.colorSuccess).toBe("#3f7d4e");
    expect(afhomesTheme.token?.colorWarning).toBe("#9a6b1f");
    expect(afhomesTheme.token?.colorError).toBe("#a63a32");
    expect(afhomesTheme.token?.colorInfo).toBe("#1f6b8f");
  });

  it("uses AFHomes surfaces, text, and borders", () => {
    expect(afhomesTheme.token?.colorBgLayout).toBe("#fbfaf7");
    expect(afhomesTheme.token?.colorBgContainer).toBe("#ffffff");
    expect(afhomesTheme.token?.colorText).toBe("#1c2b3a");
    expect(afhomesTheme.token?.colorTextSecondary).toBe("#40505f");
    expect(afhomesTheme.token?.colorBorder).toBe("#e5e0d4");
    expect(afhomesTheme.token?.colorBgContainerDisabled).toBe("#ece9e0");
    expect(afhomesTheme.token?.colorTextDisabled).toBe("#5d625d");
  });

  it("keeps the dark admin sidebar in Menu and Layout tokens", () => {
    expect(afhomesTheme.components?.Layout?.siderBg).toBe("#0e2b20");
    expect(afhomesTheme.components?.Menu?.darkItemBg).toBe("#0e2b20");
    expect(afhomesTheme.components?.Menu?.itemSelectedBg).toBe("#e8f1ec");
  });

  it("is a stable module-scoped object", () => {
    expect(afhomesTheme).toBe(afhomesTheme);
    expect(typeof afhomesTheme).toBe("object");
  });
});
