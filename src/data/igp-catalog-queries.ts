"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import type { IgpCatalogStatus } from "@/modules/igp/types";
import { useDevIdentity } from "@/shared/providers/identity-provider";

/** IGP project and unit catalog. Keys are partitioned by identity like every business query. */
export function useIgpCatalog(enabled = true) {
  const { igpCatalog } = useRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("igp-catalog", identity.id),
    queryFn: ({ signal }) => igpCatalog.list({ signal }),
    enabled,
  });
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
  };
}

export function useCreateIgpProject() {
  const { igpCatalog } = useRepositories();
  return useMutation({ mutationFn: (input: { name: string; location?: string }) => igpCatalog.createProject(input), onSuccess: useInvalidateCatalog() });
}

export function useUpdateIgpProject() {
  const { igpCatalog } = useRepositories();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; location?: string; status?: IgpCatalogStatus }) => igpCatalog.updateProject(id, input),
    onSuccess: useInvalidateCatalog(),
  });
}

export function useDeleteIgpProject() {
  const { igpCatalog } = useRepositories();
  return useMutation({ mutationFn: (id: string) => igpCatalog.deleteProject(id), onSuccess: useInvalidateCatalog() });
}

export function useCreateIgpUnit() {
  const { igpCatalog } = useRepositories();
  return useMutation({
    mutationFn: (input: { projectId: string; unitOrLot: string; propertyOwner: string }) => igpCatalog.createUnit(input),
    onSuccess: useInvalidateCatalog(),
  });
}

export function useUpdateIgpUnit() {
  const { igpCatalog } = useRepositories();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; unitOrLot?: string; propertyOwner?: string; status?: IgpCatalogStatus }) => igpCatalog.updateUnit(id, input),
    onSuccess: useInvalidateCatalog(),
  });
}

export function useDeleteIgpUnit() {
  const { igpCatalog } = useRepositories();
  return useMutation({ mutationFn: (id: string) => igpCatalog.deleteUnit(id), onSuccess: useInvalidateCatalog() });
}
