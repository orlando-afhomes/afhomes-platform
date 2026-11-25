import { route } from "@/server/api/route";
import { IgpProjectBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { createIgpProject } from "@/server/services/igp-catalog";

export const POST = route({ write: true, template: "POST /igp-catalog/projects" }, async ({ actor, body }) => {
  const input = parse(IgpProjectBody, body);
  return { status: 201, body: { project: await createIgpProject(actor, input) } };
});
