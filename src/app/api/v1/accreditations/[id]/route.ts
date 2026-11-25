import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { getAccreditation } from "@/server/services/accreditation";

export const GET = route({ write: false, template: "GET /accreditations/{id}" }, async ({ actor, params }) => ({
  body: { accreditation: await getAccreditation(actor, pathId(params.id, "Accreditation")) },
}));
