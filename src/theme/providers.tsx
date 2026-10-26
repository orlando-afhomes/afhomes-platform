"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider } from "antd";
import { afhomesTheme } from "./antd-theme";

// Single Ant Design boundary for the admin subtree.
// Scoped to /admin so public and login routes load zero antd runtime.
// afhomesTheme is module-scoped and stable: no provider remounts on navigation.
export function AntdThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={afhomesTheme}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
