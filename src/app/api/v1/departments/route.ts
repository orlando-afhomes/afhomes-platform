import { route } from "@/server/api/route";
import { DepartmentBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createDepartment, listDepartments } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /departments" }, async ({ actor }) => ({ body: { items: await listDepartments(actor) } }));

export const POST = route({ write: true, template: "POST /departments" }, async ({ actor, body }) => ({
  status: 201,
  body: { department: await createDepartment(actor, parse(DepartmentBody, body)) },
}));
