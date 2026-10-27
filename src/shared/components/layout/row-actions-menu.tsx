"use client";

import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { confirmAndRun } from "@/shared/utils/feedback";

/**
 * Shared three-dots row action menu for directory tables with more than two
 * row actions. View, Edit, and Delete each carry a distinct color; Delete
 * always asks for SweetAlert2 confirmation, then reports success or failure.
 */
export function RowActionsMenu({
  itemName,
  onView,
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
}: {
  itemName: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  deleteTitle: string;
  deleteDescription: string;
}) {
  const items: MenuProps["items"] = [
    {
      key: "view",
      label: <span className="row-actions-menu__view">View</span>,
      icon: (
        <span aria-hidden="true" className="row-actions-menu__icon">
          <EyeOutlined style={{ color: "#1677ff" }} />
        </span>
      ),
      onClick: onView,
    },
    {
      key: "edit",
      label: <span className="row-actions-menu__edit">Edit</span>,
      icon: (
        <span aria-hidden="true" className="row-actions-menu__icon">
          <EditOutlined style={{ color: "#b7791f" }} />
        </span>
      ),
      onClick: onEdit,
    },
    {
      key: "delete",
      danger: true,
      label: <span className="row-actions-menu__delete">Delete</span>,
      icon: (
        <span aria-hidden="true" className="row-actions-menu__icon">
          <DeleteOutlined />
        </span>
      ),
      onClick: () => {
        void confirmAndRun({
          title: deleteTitle,
          text: deleteDescription,
          confirmText: "Delete",
          danger: true,
          action: () => onDelete(),
          successTitle: `${itemName} deleted successfully.`,
          errorTitle: "Delete failed.",
        });
      },
    },
  ];

  return (
    <div className="row-actions-menu">
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
        <Button icon={<MoreOutlined />} aria-label={`Actions for ${itemName}`} className="row-actions-menu__trigger" />
      </Dropdown>
    </div>
  );
}
