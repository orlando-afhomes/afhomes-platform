import { route } from "@/server/api/route";
import { MemberPatch } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { getMember, updateMember } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /members/{id}" }, async ({ actor, params }) => ({
  body: { member: await getMember(actor, pathId(params.id, "Member")) },
}));

export const POST = route({ write: true, template: "POST /members/{id}" }, async ({ actor, params, body }) => ({
  body: { member: await updateMember(actor, pathId(params.id, "Member"), parse(MemberPatch, body)) },
}));
