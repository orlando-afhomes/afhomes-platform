// Backfills missing sales roles on accounts already linked to sales members.
// Dry run by default; pass --apply to write. Local demo projects only.
// Run: npm run db:backfill:sales-roles -- --apply
import { planSalesRoleBackfill } from "@/modules/sales-network/sales-role-backfill";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import { loadAccounts } from "@/server/repositories/organization";
import { loadMembers } from "@/server/repositories/sales-network";
import { transact } from "@/server/services/common";

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? "demo-afhomes";
const HOST = process.env.DATA_CONNECT_EMULATOR_HOST ?? "127.0.0.1:9399";
if (!PROJECT.startsWith("demo-")) throw new Error(`Refusing to backfill project "${PROJECT}": only demo- projects are allowed.`);
if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(HOST)) throw new Error(`Refusing to backfill host "${HOST}": only the local emulator is allowed.`);

const [members, accounts] = await Promise.all([loadMembers(), loadAccounts()]);
const plans = planSalesRoleBackfill(members, accounts);
console.log(`Sales role backfill: ${plans.length} missing assignment(s).`);
for (const plan of plans) console.log(`${plan.displayName} (${plan.memberId}) -> ${plan.role} on ${plan.accountId}`);

if (!process.argv.includes("--apply")) {
  console.log("Dry run only. Re-run with --apply to write role assignments.");
  process.exit(0);
}

for (const plan of plans) {
  await transact(null, {
    variableDefinitions: "$role: RoleAssignment_Data!",
    fields: "role: roleAssignment_upsert(data: $role)",
    variables: { role: { userId: plan.accountId, role: plan.role, status: "active" } },
    audit: [{
      action: AUDIT_ACTIONS.ACCOUNT_ROLE_ASSIGNED,
      entityType: "account",
      entityId: plan.accountId,
      details: { module: "organization", reason: "sales role backfill", memberId: plan.memberId, newValue: plan.role },
    }],
  });
}
console.log(`Applied ${plans.length} role assignment(s).`);
