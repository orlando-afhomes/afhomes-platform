import { route } from "@/server/api/route";
import { TierLevelBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createTierLevel, listTierLevelViews } from "@/server/services/catalog-admin";

export const GET = route({ write: false, template: "GET /tier-levels" }, async () => ({ body: { items: await listTierLevelViews() } }));

export const POST = route({ write: true, template: "POST /tier-levels" }, async ({ actor, body }) => {
  const input = parse(TierLevelBody, body);
  return { status: 201, body: { level: await createTierLevel(actor, input) } };
});
