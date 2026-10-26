"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Alert, Avatar, Button, Empty, Input, Popconfirm, Select, Skeleton, Space, Table, Tabs, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQueryClient } from "@tanstack/react-query";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useDepartments, useStaff, useMockRepositories, useDeleteDepartment, useDeleteStaff } from "@/data/queries";
import { isModuleGranted } from "@/modules/identity/permissions";
import { activeRoles } from "@/data/mock/dev-identities";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import type { Department, StaffMember } from "@/modules/organization/types";
import type { Account } from "@/modules/accounts/types";
import styles from "./organization-page.module.css";

const OrganizationDialogs = dynamic(
  () => import("./organization-dialogs").then((m) => m.OrganizationDialogs),
  { loading: () => <Skeleton active />, ssr: true },
);

const ROLES = ["super_admin", "admin", "hr", "finance", "svd", "ssm", "sm", "ist", "ost"] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function OrganizationPage() {
  const { identity } = useDevIdentity();
  const queryClient = useQueryClient();
  const repos = useMockRepositories();
  const deleteDepartment = useDeleteDepartment();
  const deleteStaff = useDeleteStaff();
  const departmentsQuery = useDepartments();
  const staffQuery = useStaff();

  const [tab, setTab] = useState<"departments" | "staff">("departments");
  const [search, setSearch] = useState("");
  const [deptStatusFilter, setDeptStatusFilter] = useState<string>("all");
  const [staffDeptFilter, setStaffDeptFilter] = useState<string>("all");
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState(true);

  const [deptDialog, setDeptDialog] = useState(false);
  const [staffDialog, setStaffDialog] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [profileStaff, setProfileStaff] = useState<StaffMember | null>(null);

  const [deptName, setDeptName] = useState("");
  const [deptStatus, setDeptStatus] = useState<"active" | "deactivated">("active");

  const [staffName, setStaffName] = useState("");
  const [staffPosition, setStaffPosition] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffDept, setStaffDept] = useState<string>("");
  const [staffRole, setStaffRole] = useState<string>("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffAvatar, setStaffAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isModuleGranted(identity, "organization")) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <PageHeader title="Access restricted" description="This account does not have access to Organization Management." />
        </div>
      </PageContainer>
    );
  }

  const activeRolesList = activeRoles(identity);
  const canProvisionAccounts = activeRolesList.includes("super_admin") || activeRolesList.includes("admin");

  const departments = departmentsQuery.data ?? [];
  const staff = staffQuery.data ?? [];

  const staffByDept = (deptId: string) => staff.filter((s) => s.departmentId === deptId).length;

  const activeDepartments = departments.filter((d) => d.status === "active");

  const filteredDepts = departments
    .filter((d) => {
      if (deptStatusFilter !== "all" && d.status !== deptStatusFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return d.name.toLowerCase().includes(q);
    })
    .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

  const filteredStaff = staff
    .filter((s) => {
      if (staffDeptFilter !== "all" && s.departmentId !== staffDeptFilter) return false;
      if (staffStatusFilter !== "all" && s.status !== staffStatusFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return s.displayName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.position.toLowerCase().includes(q);
    })
    .sort((a, b) => (sortAsc ? a.displayName.localeCompare(b.displayName) : b.displayName.localeCompare(a.displayName)));

  const resetDeptForm = () => { setDeptName(""); setDeptStatus("active"); setError(null); };
  const resetStaffForm = () => {
    setStaffName(""); setStaffPosition(""); setStaffEmail(""); setStaffDept(""); setStaffRole(""); setStaffPassword(""); setStaffAvatar(null); setAvatarError(null); setError(null);
  };

  const openEditDept = (d: Department) => {
    setEditDept(d);
    setDeptName(d.name);
    setDeptStatus(d.status === "deactivated" ? "deactivated" : "active");
    setError(null);
    setDeptDialog(true);
  };

  const openEditStaff = (s: StaffMember) => {
    setEditStaff(s);
    setStaffName(s.displayName);
    setStaffPosition(s.position);
    setStaffEmail(s.email);
    setStaffDept(s.departmentId ?? "");
    setStaffAvatar(s.avatarUrl);
    setError(null);
    setStaffDialog(true);
  };

  const saveDepartment = async () => {
    setError(null);
    if (!deptName.trim()) { setError("Department name is required."); return; }
    setSubmitting(true);
    try {
      if (editDept) {
        await repos.departments.update(editDept.id, { name: deptName.trim(), status: deptStatus });
      } else {
        await repos.departments.create({ name: deptName.trim(), status: deptStatus });
      }
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
      setDeptDialog(false);
      resetDeptForm();
      setEditDept(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save department.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveStaff = async () => {
    setError(null);
    if (!staffName.trim()) { setError("Full name is required."); return; }
    if (!staffEmail.trim()) { setError("Email is required."); return; }
    if (!staffDept) { setError("Department is required."); return; }
    if (canProvisionAccounts && !editStaff) {
      if (!staffRole) { setError("Role is required."); return; }
      if (staffRole === "super_admin" && !activeRolesList.includes("super_admin")) {
        setError("Cannot assign protected Super Administrator role."); return;
      }
      if (!staffPassword) { setError("Temporary password is required."); return; }
      if (staffPassword.length < 8) { setError("Temporary password must be at least 8 characters."); return; }
    }
    setSubmitting(true);
    try {
      const existingStaff = staff.find((s) => s.email.toLowerCase() === staffEmail.trim().toLowerCase() && s.id !== editStaff?.id);
      if (existingStaff) throw new Error("An employee with this email already exists.");
      if (!editStaff) {
        const accounts = (await repos.accounts.list()) as Account[];
        if (accounts.some((a) => a.email.toLowerCase() === staffEmail.trim().toLowerCase())) {
          throw new Error("An account with this email already exists.");
        }
      }

      const dept = departments.find((d) => d.id === staffDept);
      if (!dept || dept.status !== "active") throw new Error("Selected department is not active.");

      let createdStaff: StaffMember | null = null;
      try {
        if (editStaff) {
          await repos.staff.update(editStaff.id, {
            displayName: staffName.trim(),
            position: staffPosition.trim(),
            departmentId: staffDept,
            email: staffEmail.trim(),
            avatarUrl: staffAvatar,
          });
        } else {
          createdStaff = await repos.staff.create({
            displayName: staffName.trim(),
            position: staffPosition.trim(),
            departmentId: staffDept,
            email: staffEmail.trim(),
            avatarUrl: staffAvatar,
            accountId: null,
          });

          if (canProvisionAccounts) {
            const account = await repos.accounts.create({
              displayName: staffName.trim(),
              email: staffEmail.trim(),
              roleIds: [staffRole],
              departmentId: staffDept,
            });
            await repos.staff.update(createdStaff.id, { accountId: account.id });
          }
        }

        queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
        queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
        if (canProvisionAccounts) queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });

        setStaffDialog(false);
        resetStaffForm();
        setEditStaff(null);
      } catch (e) {
        // rollback
        if (createdStaff) {
          try { await repos.staff.delete(createdStaff.id); } catch { /* ignore */ }
        }
        throw e;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteDepartment = async (d: Department) => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteDepartment.mutateAsync(d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete department.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStaff = async (s: StaffMember) => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteStaff.mutateAsync(s.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const deptColumns: ColumnsType<Department> = [
    { title: "Department Name", dataIndex: "name", key: "name", render: (name: string) => <span className="font-medium">{name}</span> },
    { title: "Employees", key: "employees", render: (_, record) => staffByDept(record.id) },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: Department["status"]) => (
        <Tag color={status === "active" ? "green" : undefined}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEditDept(record)}>Edit</Button>
          <Popconfirm
            title={`Delete ${record.name}?`}
            description="This will remove the department from the directory. Departments with assigned employees cannot be deleted."
            onConfirm={() => confirmDeleteDepartment(record)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const staffColumns: ColumnsType<StaffMember> = [
    {
      title: "Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (name: string, record) => (
        <Space>
          <Avatar size="small" src={record.avatarUrl ?? undefined}>{record.avatarUrl ? null : initials(name)}</Avatar>
          <span>{name}</span>
        </Space>
      ),
    },
    { title: "Position", dataIndex: "position", key: "position" },
    {
      title: "Department",
      key: "department",
      render: (_, record) => departments.find((d) => d.id === record.departmentId)?.name ?? "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: StaffMember["status"]) => (
        <Tag color={status === "active" ? "green" : undefined}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setProfileStaff(record)}>View</Button>
          <Button type="link" size="small" onClick={() => openEditStaff(record)}>Edit</Button>
          <Popconfirm
            title={`Delete ${record.displayName}?`}
            description="This removes the staff record. Linked active accounts must be handled separately."
            onConfirm={() => confirmDeleteStaff(record)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }]} />
        <PageHeader title="Organization Management" description="Manage departments and staff." />

        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as "departments" | "staff")}
          items={[{ key: "departments", label: "Departments" }, { key: "staff", label: "Staff" }]}
        />

        <div className={styles.toolbar}>
          <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className={styles.search} />
          <div className={styles.actions}>
            {tab === "departments" ? (
              <>
                <Select
                  aria-label="Department status filter"
                  value={deptStatusFilter}
                  onChange={(value) => setDeptStatusFilter(value)}
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "deactivated", label: "Deactivated" },
                  ]}
                />
                <Button onClick={() => setSortAsc((v) => !v)}>{sortAsc ? "Sort A-Z" : "Sort Z-A"}</Button>
                <Button type="primary" onClick={() => { resetDeptForm(); setEditDept(null); setDeptDialog(true); }}>Create department</Button>
              </>
            ) : (
              <>
                <Select
                  aria-label="Staff department filter"
                  value={staffDeptFilter}
                  onChange={(value) => setStaffDeptFilter(value)}
                  options={[
                    { value: "all", label: "All departments" },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
                <Select
                  aria-label="Staff status filter"
                  value={staffStatusFilter}
                  onChange={(value) => setStaffStatusFilter(value)}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "suspended", label: "Suspended" },
                  ]}
                />
                <Button onClick={() => setSortAsc((v) => !v)}>{sortAsc ? "Sort A-Z" : "Sort Z-A"}</Button>
                <Button type="primary" onClick={() => { resetStaffForm(); setEditStaff(null); setStaffDialog(true); }}>Add staff</Button>
              </>
            )}
          </div>
        </div>

        {error && <Alert type="error" title={error} showIcon />}

        {tab === "departments" ? (
          <Table<Department>
            rowKey="id"
            columns={deptColumns}
            dataSource={filteredDepts}
            loading={departmentsQuery.isLoading}
            pagination={false}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty description="No departments found." /> }}
          />
        ) : (
          <Table<StaffMember>
            rowKey="id"
            columns={staffColumns}
            dataSource={filteredStaff}
            loading={staffQuery.isLoading}
            pagination={false}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty description="No staff found." /> }}
          />
        )}

        <OrganizationDialogs
          deptDialog={deptDialog}
          editDept={editDept}
          deptName={deptName}
          setDeptName={setDeptName}
          deptStatus={deptStatus}
          setDeptStatus={setDeptStatus}
          staffDialog={staffDialog}
          editStaff={editStaff}
          staffName={staffName}
          setStaffName={setStaffName}
          staffPosition={staffPosition}
          setStaffPosition={setStaffPosition}
          staffEmail={staffEmail}
          setStaffEmail={setStaffEmail}
          staffDept={staffDept}
          setStaffDept={setStaffDept}
          staffRole={staffRole}
          setStaffRole={setStaffRole}
          staffPassword={staffPassword}
          setStaffPassword={setStaffPassword}
          staffAvatar={staffAvatar}
          setStaffAvatar={setStaffAvatar}
          avatarError={avatarError}
          setAvatarError={setAvatarError}
          error={error}
          submitting={submitting}
          departments={departments}
          activeDepartments={activeDepartments}
          canProvisionAccounts={canProvisionAccounts}
          activeRolesList={activeRolesList}
          profileStaff={profileStaff}
          setProfileStaff={setProfileStaff}
          openEditStaff={openEditStaff}
          saveDepartment={saveDepartment}
          saveStaff={saveStaff}
          closeDeptDialog={() => setDeptDialog(false)}
          closeStaffDialog={() => { setStaffDialog(false); resetStaffForm(); setEditStaff(null); }}
        />
      </div>
    </PageContainer>
  );
}
