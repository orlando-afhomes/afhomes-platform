"use client";

import { Button, Dropdown } from "antd";
import { EditOutlined, EyeOutlined, MoreOutlined, SwapOutlined, PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

export function SalesNetworkRowActions({
  itemName,
  onView,
  onEdit,
  onTransfer,
  transferLabel = "Transfer",
  onChangeStatus,
  canEdit,
  canTransfer,
  canChangeStatus,
  canReactivate,
  status,
}: {
  itemName: string;
  onView?: () => void;
  onEdit: () => void;
  onTransfer: () => void;
  transferLabel?: string;
  onChangeStatus: () => void;
  canEdit: boolean;
  canTransfer: boolean;
  canChangeStatus: boolean;
  canReactivate: boolean;
  status: "active" | "inactive" | "suspended";
}) {
  const items: MenuProps["items"] = [];

  if (onView) {
    items.push({
      key: "view",
      label: <span className="sales-row-actions__view">View</span>,
      icon: <EyeOutlined style={{ color: "#1677ff" }} />,
      onClick: onView,
    });
  }

  if (canEdit) {
    items.push({
      key: "edit",
      label: <span className="sales-row-actions__edit">Edit</span>,
      icon: <EditOutlined style={{ color: "#b7791f" }} />,
      onClick: onEdit,
    });
  }

  if (canTransfer) {
    items.push({
      key: "transfer",
      label: <span className="sales-row-actions__transfer">{transferLabel}</span>,
      icon: <SwapOutlined style={{ color: "#174f3b" }} />,
      onClick: onTransfer,
    });
  }

  if (canChangeStatus && (status === "active" || canReactivate)) {
    const reactivate = status !== "active";
    items.push({
      key: "status",
      label: <span className="sales-row-actions__status">{reactivate ? "Reactivate" : "Deactivate"}</span>,
      icon: reactivate ? <PlayCircleOutlined style={{ color: "#3f7d4e" }} /> : <PauseCircleOutlined style={{ color: "#a63a32" }} />,
      onClick: onChangeStatus,
    });
  }

  return (
    <div className="sales-row-actions">
      <Dropdown
        menu={{ items }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <Button icon={<MoreOutlined />} aria-label={`Actions for ${itemName}`} className="sales-row-actions__trigger" />
      </Dropdown>
    </div>
  );
}