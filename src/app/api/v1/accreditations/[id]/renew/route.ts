import { route } from "@/server/api/route";
import { AccreditationRenewBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { renewAccreditation } from "@/server/services/accreditation";

export const POST = route({ write: true, template: "POST /accreditations/{id}/renew" }, async ({ actor, params, body }) => ({
  body: { accreditation: await renewAccreditation(actor, pathId(params.id, "Accreditation"), parse(AccreditationRenewBody, body)) },
}));
