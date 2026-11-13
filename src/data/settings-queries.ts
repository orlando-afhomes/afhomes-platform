"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import { listOptions, seedReferenceEntries, type ListEntryStatus, type OutletType, type ReferenceListId } from "@/modules/settings/lists";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

/** Admin-managed lists and outlets (Settings, Lists). Keys are partitioned by identity like every business query. */

const SEED_ENTRIES = seedReferenceEntries();

export function useReferenceEntries() {
  const { referenceLists } = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("reference-lists", identity.id),
    queryFn: ({ signal }) => referenceLists.list({ signal }),
  });
}

/**
 * Select options of one list: active entries plus any inactive value the record
 * already holds (`keep`). Falls back to the seed lists while loading.
 */
export function useReferenceOptions(list: ReferenceListId, keep: readonly (string | null | undefined)[] = []) {
  const entries = useReferenceEntries().data ?? SEED_ENTRIES;
  const keepKey = keep.join("|");
  // keepKey stands in for the array identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => listOptions(entries, list, keep), [entries, list, keepKey]);
}

/** Value and label of every program category (inactive ones too), to show what a record already holds. */
export function useProgramCategoryLabels() {
  const entries = useReferenceEntries().data;
  return useMemo(() => (entries ?? []).filter((entry) => entry.list === "program-category").map(({ value, label }) => ({ value, label })), [entries]);
}

export function useCreateReferenceEntry() {
  const { referenceLists } = useMockRepositories();
  const invalidate = useInvalidateSettings();
  return useMutation({ mutationFn: (input: { list: ReferenceListId; label: string }) => referenceLists.create(input), onSuccess: invalidate });
}

export function useUpdateReferenceEntry() {
  const { referenceLists } = useMockRepositories();
  const invalidate = useInvalidateSettings();
  return useMutation({ mutationFn: (input: { id: string; label?: string; status?: ListEntryStatus }) => referenceLists.update(input.id, { label: input.label, status: input.status }), onSuccess: invalidate });
}

export function useDeleteReferenceEntry() {
  const { referenceLists } = useMockRepositories();
  const invalidate = useInvalidateSettings();
  return useMutation({ mutationFn: (id: string) => referenceLists.delete(id), onSuccess: invalidate });
}

/** All outlets with usage flags; entry forms should read `useActiveOutlets` instead. */
export function useOutlets() {
  const { outlets } = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("outlets", identity.id),
    queryFn: ({ signal }) => outlets.list({ signal }),
  });
}

export function useActiveOutlets() {
  const query = useOutlets();
  const data = useMemo(() => (query.data ?? []).filter((outlet) => outlet.status === "active"), [query.data]);
  return { ...query, data };
}

export function useCreateOutlet() {
  const { outlets } = useMockRepositories();
  const invalidate = useInvalidateSettings();
  return useMutation({ mutationFn: (input: { name: string; type: OutletType }) => outlets.create(input), onSuccess: invalidate });
}

export function useUpdateOutlet() {
  const { outlets } = useMockRepositories();
  const invalidate = useInvalidateSettings();
  return useMutation({ mutationFn: (input: { id: string; name?: string; type?: OutletType; status?: ListEntryStatus }) => outlets.update(input.id, { name: input.name, type: input.type, status: input.status }), onSuccess: invalidate });
}

export function useDeleteOutlet() {
  const { outlets } = useMockRepositories();
  const invalidate = useInvalidateSettings();
  return useMutation({ mutationFn: (id: string) => outlets.delete(id), onSuccess: invalidate });
}

function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
  };
}
