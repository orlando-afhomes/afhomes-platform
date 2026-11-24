import { route } from "@/server/api/route";
import { CollectionsQuery } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { collectionsReport } from "@/server/services/reports";

export const GET = route({ write: false, template: "GET /reports/collections" }, async ({ actor, request }) => ({
  body: await collectionsReport(actor, parse(CollectionsQuery, Object.fromEntries(request.nextUrl.searchParams))),
}));
