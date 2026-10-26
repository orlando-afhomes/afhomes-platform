import type { ThemeConfig } from "antd";

// Centralized AFHomes corporate theme for Ant Design.
// Token values mirror src/theme/tokens.css; keep both in sync manually.
// Defined once at module scope so ConfigProvider never remounts consumers.
export const afhomesTheme: ThemeConfig = {
  token: {
    colorPrimary: "#174f3b",
    colorSuccess: "#3f7d4e",
    colorWarning: "#9a6b1f",
    colorError: "#a63a32",
    colorInfo: "#1f6b8f",
    colorLink: "#174f3b",
    colorBgLayout: "#fbfaf7",
    colorBgContainer: "#ffffff",
    colorBorder: "#e5e0d4",
    colorBorderSecondary: "#eae6da",
    colorText: "#1c2b3a",
    colorTextSecondary: "#40505f",
    colorTextTertiary: "#64737f",
    colorTextPlaceholder: "rgba(28, 43, 58, 0.45)",
    colorBgContainerDisabled: "#ece9e0",
    colorTextDisabled: "#5d625d",
    borderRadius: 6,
    fontSize: 14,
    controlHeight: 32,
    fontFamily:
      "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      fontWeight: 500,
    },
    Layout: {
      bodyBg: "#fbfaf7",
      headerBg: "#fbfaf7",
      siderBg: "#0e2b20",
    },
    Menu: {
      darkItemBg: "#0e2b20",
      darkItemColor: "rgba(255, 255, 255, 0.84)",
      darkItemSelectedBg: "rgba(255, 255, 255, 0.1)",
      darkItemSelectedColor: "#ffffff",
      itemSelectedBg: "#e8f1ec",
      itemSelectedColor: "#174f3b",
      itemHoverBg: "rgba(28, 43, 58, 0.06)",
    },
    Input: {
      activeBorderColor: "#174f3b",
      hoverBorderColor: "#1f6b4f",
    },
    Table: {
      headerBg: "#f4f2ec",
      headerColor: "#1c2b3a",
      rowHoverBg: "rgba(28, 43, 58, 0.06)",
      borderColor: "#e5e0d4",
    },
    Modal: {
      headerBg: "#ffffff",
      contentBg: "#ffffff",
      titleColor: "#1c2b3a",
    },
    Form: {
      labelColor: "#1c2b3a",
    },
  },
};
