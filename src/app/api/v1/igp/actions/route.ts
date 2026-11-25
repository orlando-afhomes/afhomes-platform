import { route } from "@/server/api/route";
import type { IgpAction } from "@/data/contracts/igp-repository";
import { IgpActionBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { actIgp } from "@/server/services/igp";

export const POST = route({ write: true, template: "POST /igp/actions" }, async ({ actor, body }) => ({
  body: { sale: await actIgp(actor, parse(IgpActionBody, body) as unknown as IgpAction) },
}));
