import { route } from "@/server/api/route";
import { ApiError } from "@/server/api/errors";
import { CancellationDecisionBody, CancellationRequestBody, ReasonBody, ReferenceBody, UpdateContractBody } from "@/server/api/schemas";
import { parse, pathId } from "@/server/api/validate";
import {
  approveArrangement,
  approveNonStandard,
  cancelContract,
  confirmNonStandard,
  decideCancellation,
  recordSignedAgreement,
  requestCancellation,
  resolvePaymentCode,
  returnContractForCorrection,
  updateContract,
} from "@/server/services/contracts";

/** Contract lifecycle actions (F4). Each action keeps its own audit entry and status change. */
export const POST = route({ write: true, template: "POST /contracts/{id}/{action}" }, async ({ actor, params, body }) => {
  const id = pathId(params.id, "Contract");
  switch (params.action) {
    case "update":
      return { body: { contract: await updateContract(actor, id, parse(UpdateContractBody, body ?? {})) } };
    case "return":
      return { body: { contract: await returnContractForCorrection(actor, id, parse(ReasonBody, body).reason) } };
    case "cancel":
      return { body: { contract: await cancelContract(actor, id, parse(ReasonBody, body).reason) } };
    case "cancellation-request": {
      const input = parse(CancellationRequestBody, body);
      return { body: { contract: await requestCancellation(actor, id, input.ground, input.reason) } };
    }
    case "cancellation-decision": {
      const input = parse(CancellationDecisionBody, body);
      return { body: { contract: await decideCancellation(actor, id, input.decision, input.reason) } };
    }
    case "arrangement":
      return { body: { contract: await approveArrangement(actor, id, parse(ReferenceBody, body).reference) } };
    case "non-standard-approve":
      return { body: { contract: await approveNonStandard(actor, id, parse(ReferenceBody, body).reference) } };
    case "non-standard-confirm":
      return { body: { contract: await confirmNonStandard(actor, id) } };
    case "payment-code":
      return { body: { contract: await resolvePaymentCode(actor, id, parse(ReferenceBody, body).reference) } };
    case "signed-agreement":
      return { body: { contract: await recordSignedAgreement(actor, id) } };
    default:
      throw new ApiError(404, "unknown_action", "Unknown contract action.");
  }
});
