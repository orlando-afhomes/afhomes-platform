import { route } from "@/server/api/route";
import { AccreditationIssueBody } from "@/server/api/schemas";
import { parse } from "@/server/api/validate";
import { issuePendingAccreditation } from "@/server/services/accreditation";

export const POST = route({ write: true, template: "POST /accreditations/issue" }, async ({ actor, body }) => ({
  status: 201,
  body: { accreditation: await issuePendingAccreditation(actor, parse(AccreditationIssueBody, body).memberId) },
}));
