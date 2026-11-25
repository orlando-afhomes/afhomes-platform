import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { getContractView } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /contracts/{id}" }, async ({ actor, params }) => ({
  body: { contract: await getContractView(actor, pathId(params.id, "Contract")) },
}));
