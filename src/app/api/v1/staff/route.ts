import { route } from "@/server/api/route";
import { StaffBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createStaff, listStaff } from "@/server/services/organization";

export const GET = route({ write: false, template: "GET /staff" }, async ({ actor }) => ({ body: { items: await listStaff(actor) } }));

export const POST = route({ write: true, template: "POST /staff" }, async ({ actor, body }) => ({
  status: 201,
  body: { staff: await createStaff(actor, parse(StaffBody, body)) },
}));
