"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useDepartments, useStaff, useMockRepositories } from "@/data/queries";
import { isModuleGranted } from "@/modules/identity/permissions";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogPopup, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Department, StaffMember } from "@/modules/organization/types";

export function OrganizationPage() {
  const { identity } = useDevIdentity();
  const queryClient = useQueryClient();
  const repos = useMockRepositories();
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
  const [deptCode, setDeptCode] = useState("");
  const [deptStatus, setDeptStatus] = useState<"active" | "archived">("active");

  const [staffName, setStaffName] = useState("");
  const [staffPosition, setStaffPosition] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffDept, setStaffDept] = useState<string>("");

  const [error, setError] = useState<string | null>(null);

  if (!isModuleGranted(identity, "organization")) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <PageHeader title="Access restricted" description="This account does not have access to Organization Management." />
        </div>
      </PageContainer>
    );
  }

  const departments = departmentsQuery.data ?? [];
  const staff = staffQuery.data ?? [];

  const staffByDept = (deptId: string) => staff.filter((s) => s.departmentId === deptId).length;

  const filteredDepts = departments
    .filter((d) => {
      if (deptStatusFilter !== "all" && d.status !== deptStatusFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
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

  const resetDeptForm = () => { setDeptName(""); setDeptCode(""); setDeptStatus("active"); setError(null); };
  const resetStaffForm = () => { setStaffName(""); setStaffPosition(""); setStaffEmail(""); setStaffDept(""); setError(null); };

  const openEditDept = (d: Department) => {
    setEditDept(d);
    setDeptName(d.name);
    setDeptCode(d.code);
    setDeptStatus(d.status);
    setError(null);
    setDeptDialog(true);
  };

  const openEditStaff = (s: StaffMember) => {
    setEditStaff(s);
    setStaffName(s.displayName);
    setStaffPosition(s.position);
    setStaffEmail(s.email);
    setStaffDept(s.departmentId ?? "");
    setError(null);
    setStaffDialog(true);
  };

  const saveDepartment = async () => {
    setError(null);
    if (!deptName.trim()) { setError("Department name is required."); return; }
    try {
      if (editDept) {
        await repos.departments.update(editDept.id, { name: deptName.trim(), code: deptCode.trim(), status: deptStatus });
      } else {
        await repos.departments.create({ name: deptName.trim(), code: deptCode.trim(), description: "" });
      }
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
      setDeptDialog(false);
      resetDeptForm();
      setEditDept(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save department.");
    }
  };

  const saveStaff = async () => {
    setError(null);
    if (!staffName.trim()) { setError("Name is required."); return; }
    if (!staffEmail.trim()) { setError("Email is required."); return; }
    try {
      if (editStaff) {
        await repos.staff.update(editStaff.id, { displayName: staffName.trim(), position: staffPosition.trim(), departmentId: staffDept || null });
      } else {
        await repos.staff.create({ displayName: staffName.trim(), position: staffPosition.trim(), departmentId: staffDept || null, email: staffEmail.trim() });
      }
      queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
      setStaffDialog(false);
      resetStaffForm();
      setEditStaff(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save staff.");
    }
  };

  return (
    <PageContainer>
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }]} />
        <PageHeader title="Organization Management" description="Manage departments and staff." />

        <div className="flex gap-2">
          <Button variant={tab === "departments" ? "default" : "outline"} size="sm" onClick={() => setTab("departments")}>Departments</Button>
          <Button variant={tab === "staff" ? "default" : "outline"} size="sm" onClick={() => setTab("staff")}>Staff</Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
          <div className="flex gap-2">
            {tab === "departments" ? (
              <>
                <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={deptStatusFilter} onChange={(e) => setDeptStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => setSortAsc((v) => !v)}>{sortAsc ? "Sort A-Z" : "Sort Z-A"}</Button>
                <Button size="sm" onClick={() => { resetDeptForm(); setEditDept(null); setDeptDialog(true); }}>Create department</Button>
              </>
            ) : (
              <>
                <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={staffDeptFilter} onChange={(e) => setStaffDeptFilter(e.target.value)}>
                  <option value="all">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={staffStatusFilter} onChange={(e) => setStaffStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => setSortAsc((v) => !v)}>{sortAsc ? "Sort A-Z" : "Sort Z-A"}</Button>
                <Button size="sm" onClick={() => { resetStaffForm(); setEditStaff(null); setStaffDialog(true); }}>Add staff</Button>
              </>
            )}
          </div>
        </div>

        {tab === "departments" ? (
          departmentsQuery.isLoading ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : filteredDepts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No departments found.</CardContent></Card>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Head</th>
                    <th className="px-3 py-2 text-left">Employees</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-3 py-2">{d.name}</td>
                      <td className="px-3 py-2">{d.code}</td>
                      <td className="px-3 py-2">{d.headStaffId ?? "—"}</td>
                      <td className="px-3 py-2">{staffByDept(d.id)}</td>
                      <td className="px-3 py-2"><Badge variant={d.status === "active" ? "default" : "outline"}>{d.status}</Badge></td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDept(d)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          staffQuery.isLoading ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : filteredStaff.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No staff found.</CardContent></Card>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Position</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2">{s.displayName}</td>
                      <td className="px-3 py-2">{s.position}</td>
                      <td className="px-3 py-2">{departments.find((d) => d.id === s.departmentId)?.name ?? "—"}</td>
                      <td className="px-3 py-2"><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setProfileStaff(s)}>View</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditStaff(s)}>Edit</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Create/Edit Department */}
        <Dialog open={deptDialog} onOpenChange={(o) => !o && setDeptDialog(false)}>
          <DialogPopup>
            <DialogTitle>{editDept ? "Edit department" : "Create department"}</DialogTitle>
            <DialogDescription>{editDept ? "Update department details." : "Add a new department."}</DialogDescription>
            <div className="space-y-3">
              <Input placeholder="Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              <Input placeholder="Code" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
              <select className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={deptStatus} onChange={(e) => setDeptStatus(e.target.value as "active" | "archived")}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeptDialog(false)}>Cancel</Button>
                <Button size="sm" onClick={saveDepartment}>{editDept ? "Save" : "Create"}</Button>
              </div>
            </div>
          </DialogPopup>
        </Dialog>

        {/* Create/Edit Staff */}
        <Dialog open={staffDialog} onOpenChange={(o) => !o && setStaffDialog(false)}>
          <DialogPopup>
            <DialogTitle>{editStaff ? "Edit staff" : "Add staff"}</DialogTitle>
            <DialogDescription>{editStaff ? "Update staff details." : "Add a new staff member."}</DialogDescription>
            <div className="space-y-3">
              <Input placeholder="Name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
              <Input placeholder="Position" value={staffPosition} onChange={(e) => setStaffPosition(e.target.value)} />
              <Input placeholder="Email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
              <select className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={staffDept} onChange={(e) => setStaffDept(e.target.value)}>
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setStaffDialog(false)}>Cancel</Button>
                <Button size="sm" onClick={saveStaff}>{editStaff ? "Save" : "Add"}</Button>
              </div>
            </div>
          </DialogPopup>
        </Dialog>

        {/* Staff Profile */}
        <Dialog open={!!profileStaff} onOpenChange={(o) => !o && setProfileStaff(null)}>
          <DialogPopup>
            <DialogTitle>Employee profile</DialogTitle>
            {profileStaff ? (
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Name: </span>{profileStaff.displayName}</div>
                <div><span className="text-muted-foreground">Position: </span>{profileStaff.position}</div>
                <div><span className="text-muted-foreground">Email: </span>{profileStaff.email}</div>
                <div><span className="text-muted-foreground">Department: </span>{departments.find((d) => d.id === profileStaff.departmentId)?.name ?? "—"}</div>
                <div><span className="text-muted-foreground">Status: </span>{profileStaff.status}</div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => { setProfileStaff(null); openEditStaff(profileStaff); }}>Edit</Button>
                </div>
              </div>
            ) : null}
          </DialogPopup>
        </Dialog>
      </div>
    </PageContainer>
  );
}
