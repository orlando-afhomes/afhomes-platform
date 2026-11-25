import { route } from "@/server/api/route";
import { pathId } from "@/server/api/validate";
import { discardCustomerDraft } from "@/server/services/customers";

export const POST = route({ write: true, template: "POST /customers/{id}/discard" }, async ({ actor, params }) => {
  await discardCustomerDraft(actor, pathId(params.id, "Customer"));
  return { body: { ok: true } };
});
