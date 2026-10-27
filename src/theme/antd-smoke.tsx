import { Button } from "antd";
import "./antd-smoke.css";

// Stage 1 fixture only: proves an antd component renders inside the
// AFHomes theme boundary with regular CSS. Not imported by any route;
// used by providers.test.tsx.
export function AntdSmoke() {
  return (
    <div className="antd-smoke-box">
      <Button type="primary">AFhomes theme smoke</Button>
    </div>
  );
}
