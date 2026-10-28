"use client";

import { Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AFHOMES_TABLE_PAGINATION } from "./table-pagination";
import { isRowControlClick } from "./clickable-row";
import "./directory-table.css";

export type DirectoryTableProps<T> = {
  rowKey: string | ((record: T) => string);
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;
  emptyText: string;
  /** Enables centered pagination with this page size. Omit for pagination={false}. */
  pageSize?: number;
  /** Makes rows clickable (pointer cursor); control clicks keep their own behavior. */
  onRowOpen?: (record: T) => void;
};

/**
 * Shared admin directory table: centered pagination, horizontal scroll,
 * empty state, and optional click-to-open rows shared by Staff, Departments,
 * Roles, Accounts, and Sales Network Members.
 */
export function DirectoryTable<T extends object>({
  rowKey,
  columns,
  dataSource,
  loading,
  emptyText,
  pageSize,
  onRowOpen,
}: DirectoryTableProps<T>) {
  return (
    <Table<T>
      rowKey={rowKey}
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      pagination={pageSize === undefined ? false : { ...AFHOMES_TABLE_PAGINATION, pageSize, showSizeChanger: false }}
      scroll={{ x: true }}
      locale={{ emptyText: <Empty description={emptyText} /> }}
      rowClassName={onRowOpen ? () => "afhomes-directory-table__clickable" : undefined}
      onRow={
        onRowOpen
          ? (record) => ({
              onClick: (event) => {
                if (!isRowControlClick(event)) onRowOpen(record);
              },
            })
          : undefined
      }
    />
  );
}
