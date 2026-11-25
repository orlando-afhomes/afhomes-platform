import { route } from "@/server/api/route";
import { PageQuery, SubmitPaymentBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { submitPayment } from "@/server/services/payments";
import { listPaymentViews } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /payments" }, async ({ actor, request }) => {
  const query = parse(PageQuery, Object.fromEntries(request.nextUrl.searchParams));
  return { body: await listPaymentViews(actor, { limit: query.limit, afterId: query.after }) };
});

export const POST = route({ write: true, template: "POST /payments" }, async ({ actor, body }) => ({
  status: 201,
  body: { payment: await submitPayment(actor, parse(SubmitPaymentBody, body)) },
}));
