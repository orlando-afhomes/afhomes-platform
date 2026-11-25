import "server-only";

/**
 * Multi-factor authentication hooks (owner decision 2026-11-25: enforcement is deferred).
 * Sign-in asks this module whether the account's roles need a second factor. It always
 * answers "no" for now, so the hook is wired without changing behavior; enforcement,
 * enrollment and recovery land with the staging identity-provider work.
 */
export type MfaRequirement = { required: boolean; factors: readonly string[] };

export function mfaRequirementFor(roles: readonly string[]): MfaRequirement {
  void roles; // Reserved for the role-based policy when enforcement lands.
  return { required: false, factors: [] };
}
