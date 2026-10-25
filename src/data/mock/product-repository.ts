import type { ProductRepository } from "@/data/contracts/product-repository";
import type { VipProduct } from "@/modules/vip/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { MockStore } from "./seed";
import { simulateAsync } from "@/data/contracts/async-options";

export class MockProductRepository implements ProductRepository {
  constructor(
    private readonly store: MockStore,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  async list(options?: MockAsyncOptions): Promise<VipProduct[]> {
    await simulateAsync({ ...this.asyncOptions, ...options });
    return [...this.store.products];
  }
}
