import { route } from "@/server/api/route";
import { listProducts } from "@/server/services/views";

export const GET = route({ write: false, template: "GET /products" }, async () => ({ body: { items: await listProducts() } }));
