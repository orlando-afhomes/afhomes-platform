import { route } from "@/server/api/route";
import { FillVacancyBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { fillSeatVacancy } from "@/server/services/sales-network";

export const POST = route({ write: true, template: "POST /seat-vacancies/{id}/fill" }, async ({ actor, params, body }) => ({
  body: { vacancy: await fillSeatVacancy(actor, pathId(params.id, "Vacancy"), parse(FillVacancyBody, body)) },
}));
