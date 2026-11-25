import { route } from "@/server/api/route";
import { CustomerExportBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { exportCustomers } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/export" }, async ({ actor, body }) => ({
  body: { items: await exportCustomers(actor, parse(CustomerExportBody, body)) },
}));
