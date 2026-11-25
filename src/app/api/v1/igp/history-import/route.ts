import { route } from "@/server/api/route";
import { IgpHistoryImportBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { importIgpHistory } from "@/server/services/igp";

export const POST = route({ write: true, template: "POST /igp/history-import" }, async ({ actor, body }) => ({
  body: { batch: await importIgpHistory(actor, parse(IgpHistoryImportBody, body)) },
}));
