import { route } from "@/server/api/route";
import { MemberStatusBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { changeMemberStatus } from "@/server/services/sales-network";

export const POST = route({ write: true, template: "POST /members/{id}/status" }, async ({ actor, params, body }) => ({
  body: { member: await changeMemberStatus(actor, pathId(params.id, "Member"), parse(MemberStatusBody, body).status) },
}));
