import type { OrgMember } from "@/modules/organization/types";

/**
 * Made-up network for size tests only (never part of the app's sample data):
 * 3 SVD, 12 SSM (4 per SVD), 140 SM, and `ostCount` OST spread over the leaders.
 * Names and AA numbers are synthetic.
 */
export function buildLargeNetwork(ostCount = 14_000): OrgMember[] {
  const members: OrgMember[] = [];
  const base = (id: string, name: string, designation: OrgMember["designation"], parentId: string | null, branchId: string, serial: number): OrgMember => ({
    id,
    displayName: name,
    designation,
    branchId,
    parentId,
    status: "active",
    aaNumber: `AA-${String(serial).padStart(6, "0")}`,
  });
  let serial = 1;
  const leaders: OrgMember[] = [];
  for (let v = 0; v < 3; v += 1) {
    const svd = { ...base(`svd-${v}`, `Director ${String.fromCharCode(65 + v)}`, "SVD", null, `branch-${v}`, serial++), teamName: `Team ${v}` };
    members.push(svd);
    leaders.push(svd);
    for (let s = 0; s < 4; s += 1) {
      const ssm = base(`ssm-${v}-${s}`, `Senior ${v}-${s}`, "SSM", svd.id, svd.branchId, serial++);
      members.push(ssm);
      leaders.push(ssm);
      const ssmNumber = v * 4 + s; // 140 SM over 12 SSM: the first 8 get 12, the rest 11
      const smCount = ssmNumber < 8 ? 12 : 11;
      for (let m = 0; m < smCount; m += 1) {
        const sm = base(`sm-${v}-${s}-${m}`, `Manager ${v}-${s}-${m}`, "SM", ssm.id, svd.branchId, serial++);
        members.push(sm);
        leaders.push(sm);
      }
    }
  }
  for (let i = 0; i < ostCount; i += 1) {
    const parent = leaders[i % leaders.length];
    members.push(base(`ost-${i}`, `Seller ${String(i).padStart(5, "0")}`, "OST", parent.id, parent.branchId, serial++));
  }
  return members;
}
