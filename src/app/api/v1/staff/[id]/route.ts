import { route } from "@/server/api/route";
import { StaffPatch } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { getStaff, updateStaff } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /staff/{id}" }, async ({ actor, params }) => ({
  body: { staff: await getStaff(actor, pathId(params.id, "Staff member")) },
}));

export const POST = route({ write: true, template: "POST /staff/{id}" }, async ({ actor, params, body }) => ({
  body: { staff: await updateStaff(actor, pathId(params.id, "Staff member"), parse(StaffPatch, body)) },
}));
