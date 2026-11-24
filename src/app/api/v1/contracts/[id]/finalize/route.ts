import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { finalizeContract } from "@/server/services/contracts";

export const POST = route({ write: true, template: "POST /contracts/{id}/finalize" }, async ({ actor, params }) => ({
  body: { contract: await finalizeContract(actor, pathId(params.id, "Contract")) },
}));
