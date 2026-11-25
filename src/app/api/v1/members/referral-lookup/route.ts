import { route } from "@/server/api/route";
import { lookupReferralCode } from "@/server/services/sales-network";

export const GET = route({ write: false, template: "GET /members/referral-lookup" }, async ({ request }) => ({
  body: { items: await lookupReferralCode(request.nextUrl.searchParams.get("code") ?? "") },
}));
