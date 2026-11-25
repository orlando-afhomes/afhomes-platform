import { route } from "@/server/api/route";
import { PageQuery, PrepareContractBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { prepareContract } from "@/server/services/contracts";
import { listContractViews } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /contracts" }, async ({ actor, request }) => {
  const query = parse(PageQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: await listContractViews(actor, { limit: query.limit, afterId: query.after }) };
});

export const POST = route({ write: true, template: "POST /contracts" }, async ({ actor, body }) => ({
  status: 201,
  body: { contract: await prepareContract(actor, parse(PrepareContractBody, body)) },
}));
