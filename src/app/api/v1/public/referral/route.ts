import { publicRoute } from "@/server/api/public-route";
import { resolveReferralSponsor } from "@/server/services/sales-network";

export const GET = publicRoute({ write: false, template: "GET /public/referral" }, async ({ request }) => ({
  body: { result: await resolveReferralSponsor(request.nextUrl.searchParams.get("code") ?? "") },
}));
