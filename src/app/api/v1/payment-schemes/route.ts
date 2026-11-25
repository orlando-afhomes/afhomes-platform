import { route } from "@/server/api/route";
import { listPaymentSchemes } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /payment-schemes" }, async () => ({ body: { items: await listPaymentSchemes() } }));
