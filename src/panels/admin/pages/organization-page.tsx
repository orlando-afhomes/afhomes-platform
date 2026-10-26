"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useDepartments, useStaff, useMockRepositories, useDeleteDepartment, useDeleteStaff } from "@/data/queries";
import { isModuleGranted } from "@/modules/identity/permissions";
import { activeRoles } from "@/data/mock/dev-identities";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Dialog, DialogPopup, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import type { Department, StaffMember } from "@/modules/organization/types";
import type { Account } from "@/modules/accounts/types";

const ROLES = ["super_admin", "admin", "hr", "finance", "svd", "ssm", "sm", "ist", "ost"] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function AvatarPreview({ src, name }: { src: string | null; name: string }) {
  return (
    <Avatar className="h-16 w-16">
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback>{initials(name) || "?"}</AvatarFallback>
    </Avatar>
  );
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
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);
  const [deleteStaffTarget, setDeleteStaffTarget] = useState<StaffMember | null>(null);

  const [deptName, setDeptName] = useState("");
  const [deptStatus, setDeptStatus] = useState<"active" | "deactivated">("active");

  const [staffName, setStaffName] = useState("");
  const [staffPosition, setStaffPosition] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffDept, setStaffDept] = useState<string>("");
  const [staffRole, setStaffRole] = useState<string>("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [staffAvatar, setStaffAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setStaffName(""); setStaffPosition(""); setStaffEmail(""); setStaffDept(""); setStaffRole(""); setStaffPassword(""); setShowPassword(false); setStaffAvatar(null); setAvatarError(null); setError(null);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Unsupported image format."); return; }
    if (file.size > 2 * 1024 * 1024) { setAvatarError("Image must be 2MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => setStaffAvatar(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setStaffAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      const existingAccount = repos ? null : null;
      void existingAccount;
      if (!editStaff) {
        const accounts = (await repos.accounts.list()) as Account[];
        if (accounts.some((a) => a.email.toLowerCase() === staffEmail.trim().toLowerCase())) {
          throw new Error("An account with this email already exists.");
        }
      }

      const dept = departments.find((d) => d.id === staffDept);
      if (!dept || dept.status !== "active") throw new Error("Selected department is not active.");

      let createdStaff: StaffMember | null = null;
      let createdAccountId: string | null = null;
      try {
        createdStaff = await repos.staff.create({
          displayName: staffName.trim(),
          position: staffPosition.trim(),
          departmentId: staffDept,
          email: staffEmail.trim(),
          avatarUrl: staffAvatar,
          accountId: null,
        });

        if (canProvisionAccounts && !editStaff) {
          const account = await repos.accounts.create({
            displayName: staffName.trim(),
            email: staffEmail.trim(),
            roleIds: [staffRole],
            departmentId: staffDept,
          });
          createdAccountId = account.id;
          await repos.staff.update(createdStaff.id, { accountId: account.id });
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
        if (createdAccountId) {
          // account deletion not supported; leave but mark? best effort: no delete API
        }
        throw e;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteDepartment = async () => {
    if (!deleteDept) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteDepartment.mutateAsync(deleteDept.id);
      setDeleteDept(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete department.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStaff = async () => {
    if (!deleteStaffTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteStaff.mutateAsync(deleteStaffTarget.id);
      setDeleteStaffTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete staff member.");
    } finally {
      setSubmitting(false);
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
                <Select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={deptStatusFilter} onChange={(e) => setDeptStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setSortAsc((v) => !v)}>{sortAsc ? "Sort A-Z" : "Sort Z-A"}</Button>
                <Button size="sm" onClick={() => { resetDeptForm(); setEditDept(null); setDeptDialog(true); }}>Create department</Button>
              </>
            ) : (
              <>
                <Select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={staffDeptFilter} onChange={(e) => setStaffDeptFilter(e.target.value)}>
                  <option value="all">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
                <Select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={staffStatusFilter} onChange={(e) => setStaffStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setSortAsc((v) => !v)}>{sortAsc ? "Sort A-Z" : "Sort Z-A"}</Button>
                <Button size="sm" onClick={() => { resetStaffForm(); setEditStaff(null); setStaffDialog(true); }}>Add staff</Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

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
                    <th className="px-3 py-2 text-left">Department Name</th>
                    <th className="px-3 py-2 text-left">Employees</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.map((d) => (
                    <tr key={d.id} className="border-t border-border transition-colors hover:bg-muted/50">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="px-3 py-2">{staffByDept(d.id)}</td>
                      <td className="px-3 py-2"><Badge variant={d.status === "active" ? "default" : "outline"}>{d.status}</Badge></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDept(d)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteDept(d)}>Delete</Button>
                        </div>
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
                    <tr key={s.id} className="border-t border-border transition-colors hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {s.avatarUrl ? <AvatarImage src={s.avatarUrl} alt={s.displayName} /> : null}
                            <AvatarFallback className="text-xs">{initials(s.displayName)}</AvatarFallback>
                          </Avatar>
                          <span>{s.displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{s.position}</td>
                      <td className="px-3 py-2">{departments.find((d) => d.id === s.departmentId)?.name ?? "—"}</td>
                      <td className="px-3 py-2"><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setProfileStaff(s)}>View</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditStaff(s)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteStaffTarget(s)}>Delete</Button>
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
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Department Name</Label>
                <Input placeholder="Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={deptStatus} onChange={(e) => setDeptStatus(e.target.value as "active" | "deactivated")}>
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                </Select>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setDeptDialog(false); resetDeptForm(); setEditDept(null); }}>Cancel</Button>
                <Button size="sm" onClick={saveDepartment} disabled={submitting}>{submitting ? "Saving..." : editDept ? "Save" : "Create"}</Button>
              </div>
            </div>
          </DialogPopup>
        </Dialog>

        {/* Delete Department Confirmation */}
        <AlertDialog open={!!deleteDept} onOpenChange={(o) => !o && setDeleteDept(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete department</AlertDialogTitle>
              <AlertDialogDescription>
                Delete {deleteDept?.name}? This will remove the department from the directory. Departments with assigned employees cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDept(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmDeleteDepartment} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create/Edit Staff */}
        <Dialog open={staffDialog} onOpenChange={(o) => !o && (setStaffDialog(false), resetStaffForm(), setEditStaff(null))}>
          <DialogPopup>
            <DialogTitle>{editStaff ? "Edit staff" : "Add staff"}</DialogTitle>
            <DialogDescription>{editStaff ? "Update staff details." : "Add a new staff member."}</DialogDescription>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Profile picture</Label>
                <div className="flex items-center gap-3">
                  <AvatarPreview src={staffAvatar} name={staffName || "Staff"} />
                  <div className="flex flex-col gap-1">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm" />
                    {staffAvatar ? <Button variant="outline" size="sm" onClick={removeAvatar}>Remove</Button> : null}
                    {avatarError ? <p className="text-sm text-destructive">{avatarError}</p> : null}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input placeholder="Full Name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Position</Label>
                <Input placeholder="Position" value={staffPosition} onChange={(e) => setStaffPosition(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input placeholder="Email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Select className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={staffDept} onChange={(e) => setStaffDept(e.target.value)}>
                  <option value="">Select department</option>
                  {(editStaff ? departments : activeDepartments).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
              {canProvisionAccounts ? (
                <>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                      <option value="">Select role</option>
                      {ROLES.filter((r) => r !== "super_admin" || activeRolesList.includes("super_admin")).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Temporary Password</Label>
                    <div className="flex gap-2">
                      <Input type={showPassword ? "text" : "password"} placeholder="Temporary Password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Account provisioning and role assignment are restricted to authorized administrators. A staff record will be created without a linked account.</p>
              )}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStaffDialog(false); resetStaffForm(); setEditStaff(null); }}>Cancel</Button>
                <Button size="sm" onClick={saveStaff} disabled={submitting}>{submitting ? "Saving..." : editStaff ? "Save" : "Add"}</Button>
              </div>
            </div>
          </DialogPopup>
        </Dialog>

        {/* Delete Staff Confirmation */}
        <AlertDialog open={!!deleteStaffTarget} onOpenChange={(o) => !o && setDeleteStaffTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete staff member</AlertDialogTitle>
              <AlertDialogDescription>
                Delete {deleteStaffTarget?.displayName}? This removes the staff record. Linked active accounts must be handled separately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteStaffTarget(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmDeleteStaff} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Staff Profile */}
        <Dialog open={!!profileStaff} onOpenChange={(o) => !o && setProfileStaff(null)}>
          <DialogPopup>
            <DialogTitle>Employee profile</DialogTitle>
            {profileStaff ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    {profileStaff.avatarUrl ? <AvatarImage src={profileStaff.avatarUrl} alt={profileStaff.displayName} /> : null}
                    <AvatarFallback className="text-lg">{initials(profileStaff.displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{profileStaff.displayName}</div>
                    <div className="text-muted-foreground">{profileStaff.position}</div>
                  </div>
                </div>
                <div><span className="text-muted-foreground">Email: </span>{profileStaff.email}</div>
                <div><span className="text-muted-foreground">Department: </span>{departments.find((d) => d.id === profileStaff.departmentId)?.name ?? "—"}</div>
                <div><span className="text-muted-foreground">Status: </span>{profileStaff.status}</div>
                <div><span className="text-muted-foreground">Linked account: </span>{profileStaff.accountId ?? "—"}</div>
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