import { route } from "@/server/api/route";
import { AccreditedSellerBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createAccreditedSeller } from "@/server/services/sales-network";
import type { CreateAccreditedSellerInput } from "@/modules/sales-network/types";

export const POST = route({ write: true, template: "POST /members/accredited-seller" }, async ({ actor, body }) => ({
  status: 201,
  body: await createAccreditedSeller(actor, parse(AccreditedSellerBody, body) as unknown as CreateAccreditedSellerInput),
}));
