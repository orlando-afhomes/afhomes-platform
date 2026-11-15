"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import type { IgpCatalogStatus } from "@/modules/igp/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

/** IGP project and unit catalog. Keys are partitioned by identity like every business query. */
export function useIgpCatalog(enabled = true) {
  const { igpCatalog } = useMockRepositories();
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
  const { igpCatalog } = useMockRepositories();
  return useMutation({ mutationFn: (input: { name: string; location?: string }) => igpCatalog.createProject(input), onSuccess: useInvalidateCatalog() });
}

export function useUpdateIgpProject() {
  const { igpCatalog } = useMockRepositories();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; location?: string; status?: IgpCatalogStatus }) => igpCatalog.updateProject(id, input),
    onSuccess: useInvalidateCatalog(),
  });
}

export function useDeleteIgpProject() {
  const { igpCatalog } = useMockRepositories();
  return useMutation({ mutationFn: (id: string) => igpCatalog.deleteProject(id), onSuccess: useInvalidateCatalog() });
}

export function useCreateIgpUnit() {
  const { igpCatalog } = useMockRepositories();
  return useMutation({
    mutationFn: (input: { projectId: string; unitOrLot: string; propertyOwner: string }) => igpCatalog.createUnit(input),
    onSuccess: useInvalidateCatalog(),
  });
}

export function useUpdateIgpUnit() {
  const { igpCatalog } = useMockRepositories();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; unitOrLot?: string; propertyOwner?: string; status?: IgpCatalogStatus }) => igpCatalog.updateUnit(id, input),
    onSuccess: useInvalidateCatalog(),
  });
}

export function useDeleteIgpUnit() {
  const { igpCatalog } = useMockRepositories();
  return useMutation({ mutationFn: (id: string) => igpCatalog.deleteUnit(id), onSuccess: useInvalidateCatalog() });
}
