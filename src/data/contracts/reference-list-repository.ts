import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ListEntryStatus, ReferenceEntry, ReferenceListId } from "@/modules/settings/lists";

/** `inUse`: a record already uses the entry, so it can only be deactivated, not deleted. */
export type ReferenceEntryView = ReferenceEntry & { inUse: boolean };

export interface ReferenceListRepository {
  /** Readable by every identity: forms across the platform fill their selects from it. */
  list(options?: MockAsyncOptions): Promise<ReferenceEntryView[]>;
  /** The stable `value` is derived from the label and never changes afterwards. */
  create(input: { list: ReferenceListId; label: string }, options?: MockAsyncOptions): Promise<ReferenceEntryView>;
  update(id: string, input: { label?: string; status?: ListEntryStatus }, options?: MockAsyncOptions): Promise<ReferenceEntryView>;
  deactivate(id: string, options?: MockAsyncOptions): Promise<ReferenceEntryView>;
  /** Throws with the reason when a record uses the entry. */
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
}
