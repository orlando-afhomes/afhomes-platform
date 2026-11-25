import { publicRoute } from "@/server/api/public-route";
import { verifyPublic } from "@/server/services/accreditation";

export const GET = publicRoute({ write: false, template: "GET /public/accreditation" }, async ({ request }) => {
  const result = await verifyPublic(request.nextUrl.searchParams.get("number") ?? "");
  // The public projection never carries a validity date (owner ruling 2026-11-19).
  return { body: { result: result ? { ...result, validUntil: null } : null } };
});
