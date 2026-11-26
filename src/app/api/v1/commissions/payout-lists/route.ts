import { route } from "@/server/api/route";
import { PreparePayoutListBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { payoutLists, preparePayoutList } from "@/server/services/commissions";

export const GET = route({ write: false, template: "GET /commissions/payout-lists" }, async ({ actor }) => ({ body: { items: await payoutLists(actor) } }));

export const POST = route({ write: true, template: "POST /commissions/payout-lists" }, async ({ actor, body }) => ({
  status: 201,
  body: { list: await preparePayoutList(actor, parse(PreparePayoutListBody, body).month) },
}));
