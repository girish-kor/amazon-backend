/**
 * Inventory repository interface
 */

import { InventoryLevel, Reservation, ReservationRequest } from './inventory';

export interface IInventoryRepository {
  getLevel(productId: string): Promise<InventoryLevel | null>;
  createLevel(productId: string, quantity: number): Promise<InventoryLevel>;
  updateLevel(productId: string, quantity: number): Promise<InventoryLevel>;
  reserve(request: ReservationRequest): Promise<Reservation>;
  getReservation(reservationId: string): Promise<Reservation | null>;
  confirmReservation(reservationId: string): Promise<Reservation>;
  cancelReservation(reservationId: string): Promise<void>;
  releaseExpiredReservations(): Promise<number>;
}
