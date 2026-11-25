import { route } from "@/server/api/route";
import { PageQuery } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { listSaleViews } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /sales" }, async ({ actor, request }) => {
  const query = parse(PageQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: await listSaleViews(actor, { limit: query.limit, afterId: query.after }) };
});
