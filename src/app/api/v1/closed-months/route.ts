import { route } from "@/server/api/route";
import { ClosedMonthBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { closeMonth, listClosedMonths } from "@/server/services/payments";

export const GET = route({ write: false, template: "GET /closed-months" }, async ({ actor }) => ({ body: { items: await listClosedMonths(actor) } }));

export const POST = route({ write: true, template: "POST /closed-months" }, async ({ actor, body }) => ({
  status: 201,
  body: { month: await closeMonth(actor, parse(ClosedMonthBody, body).month) },
}));
