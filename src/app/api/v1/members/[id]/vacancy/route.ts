import { route } from "@/server/api/route";
import { SeatVacancyBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { recordSeatVacancy } from "@/server/services/sales-network";

export const POST = route({ write: true, template: "POST /members/{id}/vacancy" }, async ({ actor, params, body }) => ({
  body: { vacancy: await recordSeatVacancy(actor, pathId(params.id, "Member"), parse(SeatVacancyBody, body).holderEndDate) },
}));
