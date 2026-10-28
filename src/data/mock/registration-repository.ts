import type { RegistrationRepository } from "@/data/contracts/registration-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { RegistrationApplication } from "@/modules/accreditation/types";
import { isActiveIdentity } from "./scope";
import type { MockStore } from "./seed";
import { simulateAsync } from "@/data/contracts/async-options";

// Foundation read-only repository. Submission, approval, and rejection are
// deferred to later approved Phase 06 workflows.
export class MockRegistrationRepository implements RegistrationRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private merge(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  private canRead(identity: DevIdentity): boolean {
    return (
      isActiveIdentity(identity) &&
      identity.roles.some((role) => role === "super_admin" || role === "admin")
    );
  }

  private clone(application: RegistrationApplication): RegistrationApplication {
    return {
      ...application,
      history: application.history.map((entry) => ({ ...entry })),
    };
  }

  async list(options?: MockAsyncOptions): Promise<RegistrationApplication[]> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    if (!this.canRead(this.getIdentity())) return [];
    return this.store.registrationApplications.map((application) => this.clone(application));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<RegistrationApplication | null> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    if (!this.canRead(this.getIdentity())) return null;
    const application = this.store.registrationApplications.find((item) => item.id === id);
    return application ? this.clone(application) : null;
  }
}
