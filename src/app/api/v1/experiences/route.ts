import { route } from "@/server/api/route";
import { requireModule } from "@/server/auth/authorize";
import { loadExperiences } from "@/server/repositories/content";

export const GET = route({ write: false, template: "GET /experiences" }, async ({ actor }) => {
  requireModule(actor, "experiences");
  return { body: { items: await loadExperiences() } };
});
