import { route } from "@/server/api/route";
import { PrepareContractBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { prepareContract } from "@/server/services/contracts";

export const POST = route({ write: true, template: "POST /contracts" }, async ({ actor, body }) => ({
  status: 201,
  body: { contract: await prepareContract(actor, parse(PrepareContractBody, body)) },
}));
