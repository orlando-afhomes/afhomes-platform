import { route } from "@/server/api/route";
import { MemberBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createMember, listMembers } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /members" }, async ({ actor }) => ({ body: { items: await listMembers(actor) } }));

export const POST = route({ write: true, template: "POST /members" }, async ({ actor, body }) => ({
  status: 201,
  body: { member: await createMember(actor, parse(MemberBody, body)) },
}));
