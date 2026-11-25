import { route } from "@/server/api/route";
import { DepartmentRolePatch } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { getDepartmentRole, updateDepartmentRole } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /roles/{id}" }, async ({ actor, params }) => ({
  body: { role: await getDepartmentRole(actor, pathId(params.id, "Role")) },
}));

export const POST = route({ write: true, template: "POST /roles/{id}" }, async ({ actor, params, body }) => ({
  body: { role: await updateDepartmentRole(actor, pathId(params.id, "Role"), parse(DepartmentRolePatch, body)) },
}));
