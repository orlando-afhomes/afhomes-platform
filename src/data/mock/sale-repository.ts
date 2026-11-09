import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { SaleRepository, SaleView } from "@/data/contracts/sale-repository";
import type { DevIdentity } from "@/modules/identity/types";
import { activeRoles } from "./dev-identities";
import { BusinessRepository, canSeeContract, customerName } from "./business-base";
import type { MockStore } from "./seed";
import { isActiveIdentity } from "./scope";

const BROAD = new Set(["super_admin", "admin", "finance"]);

export class MockSaleRepository extends BusinessRepository implements SaleRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private visible(identity: DevIdentity): SaleView[] {
    if (!isActiveIdentity(identity)) return [];
    const broad = activeRoles(identity).some((role) => BROAD.has(role));
    const result: SaleView[] = [];
    for (const sale of this.store.sales) {
      const contract = this.store.contracts.find((item) => item.id === sale.contractId);
      if (!contract) continue;
      // Sales follow the team recorded at the time of sale (13 section 4.3), never the current genealogy.
      const inTeam = Boolean(identity.memberId) && sale.team.some((entry) => entry.memberId === identity.memberId);
      if (!(broad ? canSeeContract(identity, contract) : inTeam)) continue;
      const seller = sale.sellerMemberId ? this.store.members.find((member) => member.id === sale.sellerMemberId) : null;
      result.push(
        JSON.parse(JSON.stringify({ ...sale, customerName: customerName(this.store, sale.customerId), sellerName: seller?.displayName ?? null, schemeLabel: contract.schemeLabel })) as SaleView,
      );
    }
    return result;
  }

  async list(options?: MockAsyncOptions): Promise<SaleView[]> {
    return this.run(options, (identity) => this.visible(identity));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<SaleView | null> {
    return this.run(options, (identity) => this.visible(identity).find((sale) => sale.id === id) ?? null);
  }
}
