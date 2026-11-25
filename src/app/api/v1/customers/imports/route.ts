import { route } from "@/server/api/route";
import { listCustomerImportJobs } from "@/server/services/customers";

export const GET = route({ write: false, template: "GET /customers/imports" }, async ({ actor }) => ({ body: { items: await listCustomerImportJobs(actor) } }));
