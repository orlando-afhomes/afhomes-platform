import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PointsLedger, ResortSpend, SpendRefund, WaiverRequest } from "@/modules/stay-points/types";

export type MembershipPoints = {
  membershipId: string;
  customerName: string;
  productCode: string;
  cardId: string | null;
  status: string;
  financialHold: boolean;
  spends: ResortSpend[];
  refunds: SpendRefund[];
  waivers: WaiverRequest[];
  ledger: PointsLedger | null;
};

export type StayPointsAction =
  | { action: "enter"; membershipId: string; venueId: string; date: string; reference: string; grossCentavos: number; excludedCentavos: number; holder: "primary" | "supplementary"; description: string }
  | { action: "approve"; spendId: string }
  | { action: "refund"; spendId: string; date: string; amountCentavos: number; reason: string }
  | { action: "request-waiver"; membershipId: string; tranche: number; date: string; ground: WaiverRequest["ground"]; supportingReference: string }
  | { action: "decide-waiver"; waiverId: string; granted: boolean; releaseDate: string | null; reason: string };

export type StayPointsOverview = {
  memberships: MembershipPoints[];
  venues: { id: string; name: string }[];
};

export interface StayPointsRepository {
  list(options?: MockAsyncOptions): Promise<MembershipPoints[]>;
  venues(options?: MockAsyncOptions): Promise<StayPointsOverview["venues"]>;
  act(action: StayPointsAction, options?: MockAsyncOptions): Promise<MembershipPoints>;
}
