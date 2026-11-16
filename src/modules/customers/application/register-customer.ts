import type { ContractRepository, PrepareContractInput } from "@/data/contracts/contract-repository";
import { CustomerValidationError, type CustomerRepository } from "@/data/contracts/customer-repository";
import type { PaymentRepository, SubmitPaymentInput } from "@/data/contracts/payment-repository";
import type { CustomerDraftInput } from "../types";

type RegistrationRepositories = {
  customers: Pick<CustomerRepository, "createDraft" | "updateDraft" | "submit">;
  contracts: Pick<ContractRepository, "prepare" | "submit">;
  payments: Pick<PaymentRepository, "submit">;
};

export type CustomerRegistrationInput = {
  customer: CustomerDraftInput;
  draftId?: string;
  contract?: Omit<PrepareContractInput, "customerId" | "newPurchaseRequestId"> & {
    reservation?: Omit<SubmitPaymentInput, "contractId" | "purpose">;
  };
};

type RegistrationOutcome = { customerId: string } & (
  | { status: "draft-kept"; errors: CustomerValidationError["errors"] }
  | { status: "customer-submitted" }
  // submitError is set when the contract was prepared but could not be submitted; it stays a Draft for the Clerk to submit.
  | { status: "contract-prepared" | "reservation-submitted"; contractId: string; submitError?: string }
  | { status: "contract-failed"; error: unknown }
  | { status: "reservation-failed"; contractId: string; error: unknown }
);

export async function registerCustomer(
  repositories: RegistrationRepositories,
  { customer, draftId, contract }: CustomerRegistrationInput,
): Promise<RegistrationOutcome> {
  const draft = draftId
    ? await repositories.customers.updateDraft(draftId, customer)
    : await repositories.customers.createDraft(customer);
  const customerId = draft.id;

  try {
    await repositories.customers.submit(customerId, customer);
  } catch (error) {
    if (error instanceof CustomerValidationError) return { status: "draft-kept", customerId, errors: error.errors };
    throw error;
  }

  if (!contract) return { status: "customer-submitted", customerId };

  const { reservation, ...preparation } = contract;
  let contractId: string;
  try {
    const prepared = await repositories.contracts.prepare({
      ...preparation,
      customerId,
      reservationDate: reservation?.paidDate ?? preparation.reservationDate,
    });
    contractId = prepared.id;
  } catch (error) {
    return { status: "contract-failed", customerId, error };
  }

  // Doc 05 section 11 step 4: the registration itself submits the contract, so the Clerk does not reopen it.
  let submitError: string | undefined;
  try {
    await repositories.contracts.submit(contractId);
  } catch (error) {
    submitError = error instanceof Error ? error.message : "Could not submit the contract.";
  }
  const submitted = submitError ? { submitError } : {};

  if (!reservation) return { status: "contract-prepared", customerId, contractId, ...submitted };

  try {
    await repositories.payments.submit({ ...reservation, contractId, purpose: "reservation" });
    return { status: "reservation-submitted", customerId, contractId, ...submitted };
  } catch (error) {
    return { status: "reservation-failed", customerId, contractId, error };
  }
}
