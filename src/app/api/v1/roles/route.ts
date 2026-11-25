import { route } from "@/server/api/route";
import { DepartmentRoleBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createDepartmentRole, listDepartmentRoles } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /roles" }, async ({ actor }) => ({ body: { items: await listDepartmentRoles(actor) } }));

export const POST = route({ write: true, template: "POST /roles" }, async ({ actor, body }) => ({
  status: 201,
  body: { role: await createDepartmentRole(actor, parse(DepartmentRoleBody, body)) },
}));
