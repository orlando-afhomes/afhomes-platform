import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { VipProduct } from "@/modules/vip/types";

export interface ProductRepository {
  list(options?: MockAsyncOptions): Promise<VipProduct[]>;
}
