import type { TablePaginationConfig } from "antd/es/table";

/**
 * Shared centered pagination for AFHomes data tables. Spread first, then add
 * page-specific options (pageSize, current, onChange, ...). Tables with
 * pagination intentionally disabled keep `pagination={false}`.
 */
export const AFHOMES_TABLE_PAGINATION: TablePaginationConfig = {
  placement: ["bottomCenter"],
};
