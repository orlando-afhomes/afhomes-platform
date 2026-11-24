import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { submitContract } from "@/server/services/contracts";

export const POST = route({ write: true, template: "POST /contracts/{id}/submit" }, async ({ actor, params }) => ({
  body: await submitContract(actor, pathId(params.id, "Contract")),
}));
