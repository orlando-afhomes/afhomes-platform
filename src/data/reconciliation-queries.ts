"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import type { ReceiptImportRecord } from "@/modules/imports/receipt-import";
import type { ReconciliationDecisionInput } from "@/modules/reconciliation/rules";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

/**
 * Hooks for reconciliation (F11.3) and the historical receipt import (F11.5). Keys sit under the business
 * namespace and are partitioned by dev identity, so one identity's records never show under another and a
 * business mutation elsewhere refreshes them.
 */
export function useReconciliationTotals(period: string, enabled: boolean) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: [...queryKeys.business.list("reconciliation-totals", identity.id), period],
    queryFn: ({ signal }) => repositories.reconciliation.sourceTotals(period, { signal }),
    enabled,
  });
}

export function useReconciliationEntries(enabled: boolean) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("reconciliation-entries", identity.id),
    queryFn: ({ signal }) => (enabled ? repositories.reconciliation.listEntries({ signal }) : Promise.resolve([])),
  });
}

export function useRecordReconciliation() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReconciliationDecisionInput) => repositories.reconciliation.record(input),
    onSuccess: () => {
      for (const key of [queryKeys.business.all, queryKeys.audit.all]) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useReceiptImportBatches(enabled: boolean) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("receipt-import-batches", identity.id),
    queryFn: ({ signal }) => (enabled ? repositories.historyImports.listBatches({ signal }) : Promise.resolve([])),
  });
}

export type ReceiptImportAction =
  | { action: "create"; fileName: string; records: ReceiptImportRecord[]; declaration: boolean }
  | { action: "signOff"; id: string }
  | { action: "reject"; id: string; reason: string };

export function useReceiptImportAction() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: ReceiptImportAction) => {
      switch (variables.action) {
        case "create": return repositories.historyImports.createBatch({ fileName: variables.fileName, records: variables.records, declaration: variables.declaration });
        case "signOff": return repositories.historyImports.signOff(variables.id);
        case "reject": return repositories.historyImports.reject(variables.id, variables.reason);
      }
    },
    onSuccess: () => {
      for (const key of [queryKeys.business.all, queryKeys.audit.all]) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
