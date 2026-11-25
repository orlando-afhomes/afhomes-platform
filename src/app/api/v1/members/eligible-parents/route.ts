import { route } from "@/server/api/route";
import { invalid } from "@/server/services/common";
import { listEligibleParents } from "@/server/services/sales-network";

const DESIGNATIONS = ["SVD", "SSM", "SM", "OST"] as const;

export const GET = route({ write: false, template: "GET /members/eligible-parents" }, async ({ actor, request }) => {
  const designation = request.nextUrl.searchParams.get("designation") ?? "";
  if (!DESIGNATIONS.includes(designation as (typeof DESIGNATIONS)[number])) throw invalid("Choose a valid position.");
  return { body: { items: await listEligibleParents(actor, designation as (typeof DESIGNATIONS)[number]) } };
});
