import { Button } from "antd";
import styles from "./antd-smoke.module.css";

// Stage 1 fixture only: proves an antd component renders inside the
// AFHomes theme boundary with a locally scoped CSS Module.
// Not imported by any route; used by providers.test.tsx.
export function AntdSmoke() {
  return (
    <div className={styles.smokeBox}>
      <Button type="primary">AFhomes theme smoke</Button>
    </div>
  );
}
