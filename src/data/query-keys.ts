import type { AuditQuery } from "@/modules/audit/types";

/** Centralized, stable TanStack Query keys. Add a namespace here before using it in a hook. */
export const queryKeys = {
  audit: {
    /** Prefix of every audit query, used for invalidation and cleanup. */
    all: ["audit"] as const,
    /**
     * Partitioned by identity and audit-read eligibility, so an identity whose
     * access changes (or a different identity) can never read another
     * partition's cached protected records. Empty filters are dropped so
     * equivalent queries share one entry.
     */
    list: (identityId: string, access: "read" | "denied", query: AuditQuery = {}) =>
      ["audit", identityId, access, Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined))] as const,
  },
  business: {
    /** Prefix of every business-module query (customers through stay points). */
    all: ["business"] as const,
    /** Always partitioned by the active identity. */
    list: (namespace: string, identityId: string) => ["business", namespace, identityId] as const,
  },
} as const;
