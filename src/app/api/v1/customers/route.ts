import { route } from "@/server/api/route";
import { CustomerBody, CustomerListQuery } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createCustomerDraft, listCustomers } from "@/server/services/customers";

export const GET = route({ write: false, template: "GET /customers" }, async ({ actor, request }) => {
  const query = parse(CustomerListQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: await listCustomers(actor, { limit: query.limit, afterId: query.after }) };
});

export const POST = route({ write: true, template: "POST /customers" }, async ({ actor, body }) => ({
  status: 201,
  body: { customer: await createCustomerDraft(actor, parse(CustomerBody, body)) },
}));
