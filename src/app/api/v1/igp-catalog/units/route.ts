import { route } from "@/server/api/route";
import { IgpUnitBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createIgpUnit } from "@/server/services/igp-catalog";

export const POST = route({ write: true, template: "POST /igp-catalog/units" }, async ({ actor, body }) => {
  const input = parse(IgpUnitBody, body);
  return { status: 201, body: { unit: await createIgpUnit(actor, input) } };
});
