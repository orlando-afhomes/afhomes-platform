import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReservationInput, RestaurantReservation } from "@/modules/reservations/types";

/** Restaurant table reservations. Office staff record them; no points or money move (owner decision 2026-11-23). */
export interface ReservationRepository {
  list(options?: MockAsyncOptions): Promise<RestaurantReservation[]>;
  create(input: ReservationInput, options?: MockAsyncOptions): Promise<RestaurantReservation>;
  cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<RestaurantReservation>;
}
