import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { descendants, directDownline } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /members/{id}/downline" }, async ({ actor, params, request }) => {
  const id = pathId(params.id, "Member");
  const all = request.nextUrl.searchParams.get("scope") === "all";
  return { body: { items: all ? await descendants(actor, id) : await directDownline(actor, id) } };
});
