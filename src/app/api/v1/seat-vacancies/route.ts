import { route } from "@/server/api/route";
import { listSeatVacancies } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /seat-vacancies" }, async ({ actor }) => ({ body: { items: await listSeatVacancies(actor) } }));
