import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { listMemberAccreditations } from "@/server/services/accreditation";

export const GET = route({ write: false, template: "GET /members/{id}/accreditations" }, async ({ actor, params }) => ({
  body: { items: await listMemberAccreditations(actor, pathId(params.id, "Member")) },
}));
