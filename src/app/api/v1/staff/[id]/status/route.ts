import { route } from "@/server/api/route";
import { StaffStatusBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { updateLinkedAccountStatus } from "@/server/services/organization";

export const POST = route({ write: true, template: "POST /staff/{id}/status" }, async ({ actor, params, body }) => ({
  body: { linkedAccount: await updateLinkedAccountStatus(actor, pathId(params.id, "Staff member"), parse(StaffStatusBody, body).status) },
}));
