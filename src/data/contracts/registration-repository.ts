import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { RegistrationApplicant, RegistrationApplication, RegistrationCompletion } from "@/modules/accreditation/types";

export type SubmitRegistrationInput = { referralCode: string; applicant: RegistrationApplicant };

/** What the applicant is told after submitting: a neutral code, nothing about the record. */
export type RegistrationReceipt = { reference: string };

/** Restricted projection for the private correction link: no internal ids, no office-only data. */
export type RegistrationCorrectionView = {
  reference: string;
  version: number;
  returnReason: string;
  applicant: RegistrationApplicant;
};

export interface RegistrationRepository {
  /** Office queue (Clerk, Administrator, Super Administrator); empty for anyone else. */
  list(options?: MockAsyncOptions): Promise<RegistrationApplication[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<RegistrationApplication | null>;

  // Public, no sign-in. A submitted application is not a seller record: no AA number, no login (doc 03 section 9.2).
  submit(input: SubmitRegistrationInput, options?: MockAsyncOptions): Promise<RegistrationReceipt>;
  /** Null for an unknown, used or no longer valid link. */
  getForCorrection(token: string, options?: MockAsyncOptions): Promise<RegistrationCorrectionView | null>;
  /** Corrects the same application as a new version; the link works once. */
  resubmit(token: string, applicant: RegistrationApplicant, options?: MockAsyncOptions): Promise<RegistrationReceipt>;

  // Office. Every step appends history and an audit event.
  /** Clerk, Administrator or Super Administrator checks the entry and completes the seller details. */
  complete(id: string, completion: RegistrationCompletion, options?: MockAsyncOptions): Promise<RegistrationApplication>;
  /** Administrator or Super Administrator only: creates the OST through the seller path and issues the AA number. */
  approve(id: string, input: { approvedStart: string }, options?: MockAsyncOptions): Promise<RegistrationApplication>;
  /** Administrator or Super Administrator only; the reason is required. Creates the private correction link. */
  returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<RegistrationApplication>;
  /** Administrator or Super Administrator only; the reason is required. */
  reject(id: string, reason: string, options?: MockAsyncOptions): Promise<RegistrationApplication>;
}
