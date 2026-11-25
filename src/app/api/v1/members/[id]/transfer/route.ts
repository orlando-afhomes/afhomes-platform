import { route } from "@/server/api/route";
import { MemberTransferBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { transferMember } from "@/server/services/sales-network";

export const POST = route({ write: true, template: "POST /members/{id}/transfer" }, async ({ actor, params, body }) => {
  const input = parse(MemberTransferBody, body);
  return { body: { member: await transferMember(actor, pathId(params.id, "Member"), input.newParentId, { designation: input.designation, teamName: input.teamName }) } };
});
