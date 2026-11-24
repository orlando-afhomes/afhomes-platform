"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Ban, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useOperation } from "@/data/business-queries";
import type { IgpProjectView, IgpUnitView } from "@/data/contracts/igp-catalog-repository";
import {
  useCreateIgpProject,
  useCreateIgpUnit,
  useDeleteIgpProject,
  useDeleteIgpUnit,
  useIgpCatalog,
  useUpdateIgpProject,
  useUpdateIgpUnit,
} from "@/data/igp-catalog-queries";
import { IGP_LOCATION_MAX, IGP_OWNER_MAX, IGP_PROJECT_NAME_MAX, IGP_UNIT_MAX } from "@/modules/igp/rules";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { QueryState } from "@/shared/components/modern/query-state";
import { DetailActions } from "@/shared/components/modern/detail-actions";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { TextField } from "@/shared/forms/modern";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";

const COLUMNS: ColumnDef<IgpProjectView, unknown>[] = [
  { id: "name", header: "Project", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name}</span> },
  { id: "location", header: "Location", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.location },
  { id: "units", header: "Units", cell: ({ row }) => row.original.unitCount },
  { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

/** Heading button of the Projects tab (Sales area). The area page owns the dialog's open state. */
export function IgpProjectsActions({ onAdd }: { onAdd: () => void }) {
  const canManage = useOperation("igp.manage");
  return canManage ? <Button onClick={onAdd}>Add Project</Button> : null;
}

export function IgpProjectsTab({ adding, onAddingClose }: { adding: boolean; onAddingClose: () => void }) {
  const canManage = useOperation("igp.manage");
  const catalogQuery = useIgpCatalog();
  const updateProject = useUpdateIgpProject();
  const deleteProject = useDeleteIgpProject();
  const updateUnit = useUpdateIgpUnit();
  const deleteUnit = useDeleteIgpUnit();
  const { confirmRun, dialog: confirmation } = useConfirmRun();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [unitDialog, setUnitDialog] = useState<{ unit: IgpUnitView | null } | null>(null);

  const catalog = catalogQuery.data;
  const projects = useMemo(
    () => (catalog?.projects ?? []).filter((item) => matchesSearch(search, item.name, item.location ?? "")),
    [catalog, search],
  );
  const project = catalog?.projects.find(({ id }) => id === selectedId);
  const units = (catalog?.units ?? []).filter(({ projectId }) => projectId === project?.id);

  const setProjectStatus = (item: IgpProjectView, status: "active" | "inactive") => confirmRun({
    title: status === "inactive" ? `Deactivate ${item.name}?` : `Reactivate ${item.name}?`,
    description: status === "inactive"
      ? "Sales can no longer pick it for new sales. Sales already recorded keep showing it."
      : "Sales can pick it again.",
    confirmText: status === "inactive" ? "Deactivate" : "Reactivate",
    tone: status === "inactive" ? "warning" : "success",
    action: () => updateProject.mutateAsync({ id: item.id, status }),
    successTitle: status === "inactive" ? `${item.name} deactivated.` : `${item.name} reactivated.`,
    errorTitle: "Could not change the project.",
  });
  const setUnitStatus = (item: IgpUnitView, status: "active" | "inactive") => confirmRun({
    title: status === "inactive" ? `Deactivate ${item.unitOrLot}?` : `Reactivate ${item.unitOrLot}?`,
    description: status === "inactive"
      ? "Sales can no longer pick it for new sales. Sales already recorded keep showing it."
      : "Sales can pick it again.",
    confirmText: status === "inactive" ? "Deactivate" : "Reactivate",
    tone: status === "inactive" ? "warning" : "success",
    action: () => updateUnit.mutateAsync({ id: item.id, status }),
    successTitle: status === "inactive" ? `${item.unitOrLot} deactivated.` : `${item.unitOrLot} reactivated.`,
    errorTitle: "Could not change the unit or lot.",
  });

  const unitRows = project ? (units.length === 0
    ? [{ label: "Units", value: "No units yet. Add one so sales can pick it." }]
    : units.map((unit) => ({
      label: unit.unitOrLot,
      value: <span className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
        <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <span>{unit.propertyOwner}</span>
          <StatusBadge status={unit.status} />
        </span>
        <RowActionsMenu itemName={unit.unitOrLot}
          onEdit={() => setUnitDialog({ unit })}
          extraItems={[unit.status === "active"
            ? { key: "deactivate", label: "Deactivate", tone: "warning", icon: Ban, onClick: () => setUnitStatus(unit, "inactive") }
            : { key: "reactivate", label: "Reactivate", tone: "success", icon: RotateCcw, onClick: () => setUnitStatus(unit, "active") }]}
          onDelete={unit.inUse ? undefined : () => deleteUnit.mutateAsync(unit.id)}
          deleteDisabledReason={unit.inUse ? "A sale uses this unit or lot. Deactivate it instead." : null}
          deleteTitle={`Delete ${unit.unitOrLot}?`}
          deleteDescription="This removes the unit or lot. Only units that no sale uses can be deleted." />
      </span>,
      wide: true,
    }))) : [];

  return (
    <AdminPage anyOf={["sales", "finance"]} allowed={canManage} title="Projects" crumbs={[{ label: "Sales" }, { label: "Projects" }]} embedded>
      <QueryState isLoading={catalogQuery.isLoading} error={catalogQuery.error}>
        {catalog && <>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search projects" />
          <DataTable data={projects} columns={COLUMNS} getRowId={({ id }) => id} caption="Projects"
            emptyText={catalog.projects.length === 0 ? "No projects yet. Add one so sales can pick it." : "No projects match the search."}
            onRowOpen={(row) => setSelectedId(row.id)} getRowLabel={(row) => `Open project ${row.name}`} />
          <RecordDetailsSheet open={project !== undefined} onClose={() => setSelectedId(null)} size="lg"
            title={project?.name ?? "Project"} subtitle={project?.location ?? undefined}
            badge={project ? <StatusBadge status={project.status} /> : undefined}
            sections={project ? [
              { title: "Project", rows: [
                { label: "Project", value: project.name },
                { label: "Location", value: project.location },
                { label: "Units", value: project.unitCount },
                { label: "Used by sales", value: project.inUse ? "Yes" : "No" },
              ] },
              { title: "Units and Lots", rows: unitRows },
            ] : []}
            footer={project ? <DetailActions actions={[
              { key: "add-unit", label: "Add Unit", next: true, icon: Plus, onClick: () => setUnitDialog({ unit: null }) },
              { key: "edit", label: "Edit Project", variant: "warning", next: true, icon: Pencil, onClick: () => setEditingProject(true) },
              project.status === "active"
                ? { key: "deactivate", label: "Deactivate Project", variant: "orange", icon: Ban, onClick: () => setProjectStatus(project, "inactive") }
                : { key: "reactivate", label: "Reactivate", variant: "success", icon: RotateCcw, onClick: () => setProjectStatus(project, "active") },
              !project.inUse && { key: "delete", label: "Delete Project", variant: "destructive", icon: Trash2, onClick: () => confirmRun({
                title: `Delete ${project.name}?`, description: "This removes the project and its units. Only projects that no sale uses can be deleted.",
                confirmText: "Delete Project", danger: true, action: async () => { await deleteProject.mutateAsync(project.id); setSelectedId(null); },
                successTitle: `${project.name} deleted.`, errorTitle: "Could not delete the project.",
              }) },
            ]} /> : undefined} />
          {(adding || (editingProject && project)) && (
            <IgpProjectDialog key={adding ? "new" : project?.id} project={adding ? null : project ?? null}
              onClose={() => { onAddingClose(); setEditingProject(false); }} />
          )}
          {unitDialog && project && <IgpUnitDialog project={project} unit={unitDialog.unit} onClose={() => setUnitDialog(null)} />}
        </>}
      </QueryState>
      {confirmation}
    </AdminPage>
  );
}

function IgpProjectDialog({ project, onClose }: { project: IgpProjectView | null; onClose: () => void }) {
  const create = useCreateIgpProject();
  const update = useUpdateIgpProject();
  const [name, setName] = useState(project?.name ?? "");
  const [location, setLocation] = useState(project?.location ?? "");
  const [error, setError] = useState<string>();
  const submit = async () => {
    try {
      if (project) await update.mutateAsync({ id: project.id, name, location });
      else await create.mutateAsync({ name, location });
      toast.success(project ? "Project saved." : "Project added.", { description: name.trim() });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the project.");
    }
  };
  return (
    <FormDialog open title={project ? "Edit Project" : "Add Project"} submitText={project ? "Save" : "Add Project"}
      pending={create.isPending || update.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <TextField label="Project name" required value={name} maxLength={IGP_PROJECT_NAME_MAX} onChange={(value) => { setName(value); setError(undefined); }} />
      <TextField label="Location" value={location} maxLength={IGP_LOCATION_MAX} onChange={setLocation} />
    </FormDialog>
  );
}

function IgpUnitDialog({ project, unit, onClose }: { project: IgpProjectView; unit: IgpUnitView | null; onClose: () => void }) {
  const create = useCreateIgpUnit();
  const update = useUpdateIgpUnit();
  const [unitOrLot, setUnitOrLot] = useState(unit?.unitOrLot ?? "");
  const [propertyOwner, setPropertyOwner] = useState(unit?.propertyOwner ?? "");
  const [error, setError] = useState<string>();
  const submit = async () => {
    try {
      if (unit) await update.mutateAsync({ id: unit.id, unitOrLot, propertyOwner });
      else await create.mutateAsync({ projectId: project.id, unitOrLot, propertyOwner });
      toast.success(unit ? "Unit or lot saved." : "Unit or lot added.", { description: unitOrLot.trim() });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the unit or lot.");
    }
  };
  return (
    <FormDialog open title={unit ? "Edit Unit or Lot" : "Add Unit or Lot"} description={`In ${project.name}.`} submitText={unit ? "Save" : "Add"}
      pending={create.isPending || update.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <TextField label="Unit or lot" required value={unitOrLot} maxLength={IGP_UNIT_MAX} onChange={(value) => { setUnitOrLot(value); setError(undefined); }} />
      <TextField label="Property owner" required value={propertyOwner} maxLength={IGP_OWNER_MAX} onChange={setPropertyOwner} />
    </FormDialog>
  );
}
