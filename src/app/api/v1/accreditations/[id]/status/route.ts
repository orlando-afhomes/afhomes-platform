import { route } from "@/server/api/route";
import { AccreditationStatusBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import { updateAccreditationStatus } from "@/server/services/accreditation";
import type { AccreditationStatusRequest } from "@/data/contracts/accreditation-repository";

export const POST = route({ write: true, template: "POST /accreditations/{id}/status" }, async ({ actor, params, body }) => {
  const input = parse(AccreditationStatusBody, body);
  return {
    body: {
      accreditation: await updateAccreditationStatus(actor, pathId(params.id, "Accreditation"), input.requested as AccreditationStatusRequest, input.expectedPrevious, input.reason),
    },
  };
});
