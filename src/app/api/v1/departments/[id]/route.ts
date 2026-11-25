import { route } from "@/server/api/route";
import { DepartmentPatch } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { getDepartment, updateDepartment } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /departments/{id}" }, async ({ actor, params }) => ({
  body: { department: await getDepartment(actor, pathId(params.id, "Department")) },
}));

export const POST = route({ write: true, template: "POST /departments/{id}" }, async ({ actor, params, body }) => ({
  body: { department: await updateDepartment(actor, pathId(params.id, "Department"), parse(DepartmentPatch, body)) },
}));
