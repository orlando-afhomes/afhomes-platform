import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { RegistrationApplication } from "@/modules/accreditation/types";

export interface RegistrationRepository {
  list(options?: MockAsyncOptions): Promise<RegistrationApplication[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<RegistrationApplication | null>;
}
