import { route } from "@/server/api/route";
import { CustomerImportBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { importCustomers } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/import" }, async ({ actor, body }) => ({
  status: 201,
  body: { job: await importCustomers(actor, parse(CustomerImportBody, body)) },
}));
