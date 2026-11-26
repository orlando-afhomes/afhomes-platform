import { route } from "@/server/api/route";
import { AllowanceReviewBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { allowanceReviews, saveAllowanceReview } from "@/server/services/commissions";

export const GET = route({ write: false, template: "GET /commissions/allowances" }, async ({ actor }) => ({ body: await allowanceReviews(actor) }));

export const POST = route({ write: true, template: "POST /commissions/allowances" }, async ({ actor, body }) => ({
  status: 201,
  body: { review: await saveAllowanceReview(actor, parse(AllowanceReviewBody, body)) },
}));
