import type { ContractRepository, PrepareContractInput } from "@/data/contracts/contract-repository";
import { CustomerValidationError, type CustomerRepository } from "@/data/contracts/customer-repository";
import type { PaymentRepository, SubmitPaymentInput } from "@/data/contracts/payment-repository";
import type { CustomerDraftInput } from "../types";

type RegistrationRepositories = {
  customers: Pick<CustomerRepository, "createDraft" | "updateDraft" | "submit">;
  contracts: Pick<ContractRepository, "prepare">;
  payments: Pick<PaymentRepository, "submit">;
};

export type CustomerRegistrationInput = {
  customer: CustomerDraftInput;
  draftId?: string;
  contract?: Omit<PrepareContractInput, "customerId"> & {
    reservation?: Omit<SubmitPaymentInput, "contractId" | "purpose">;
  };
};

type RegistrationOutcome = { customerId: string } & (
  | { status: "draft-kept"; errors: CustomerValidationError["errors"] }
  | { status: "customer-submitted" }
  | { status: "contract-prepared" | "reservation-submitted"; contractId: string }
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

  if (!reservation) return { status: "contract-prepared", customerId, contractId };

  try {
    await repositories.payments.submit({ ...reservation, contractId, purpose: "reservation" });
    return { status: "reservation-submitted", customerId, contractId };
  } catch (error) {
    return { status: "reservation-failed", customerId, contractId, error };
  }
}
