/**
 * Inventory service business logic
 */

import { InventoryLevel, Reservation, ReservationRequest } from '../domain/inventory';
import { IInventoryRepository } from '../domain/inventory-repository';
import { ValidationError, NotFoundError, ConflictError } from '@shared/errors';

export class InventoryService {
  constructor(private inventoryRepository: IInventoryRepository) {}

  /**
   * Get inventory level for product
   */
  async getInventory(productId: string): Promise<InventoryLevel> {
    let level = await this.inventoryRepository.getLevel(productId);
    if (!level) {
      // Create new inventory level if doesn't exist
      level = await this.inventoryRepository.createLevel(productId, 0);
    }
    return level;
  }

  /**
   * Stock product with quantity
   */
  async stockProduct(productId: string, quantity: number): Promise<InventoryLevel> {
    if (!productId || quantity <= 0) {
      throw new ValidationError('Product ID and quantity are required');
    }

    return this.inventoryRepository.updateLevel(productId, quantity);
  }

  /**
   * Reserve inventory for order
   */
  async reserveInventory(request: ReservationRequest): Promise<Reservation> {
    if (!request.productId || !request.orderId || request.quantity <= 0) {
      throw new ValidationError('Product ID, order ID, and quantity are required');
    }

    const level = await this.inventoryRepository.getLevel(request.productId);
    if (!level) {
      throw new NotFoundError('Product not found in inventory');
    }

    const available = level.quantity - level.reserved;
    if (available < request.quantity) {
      throw new ConflictError('Insufficient inventory');
    }

    return this.inventoryRepository.reserve(request);
  }

  /**
   * Confirm reservation (convert to committed)
   */
  async confirmReservation(reservationId: string): Promise<Reservation> {
    const reservation = await this.inventoryRepository.getReservation(reservationId);
    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status !== 'pending') {
      throw new ConflictError('Reservation is not pending');
    }

    return this.inventoryRepository.confirmReservation(reservationId);
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId: string): Promise<void> {
    const reservation = await this.inventoryRepository.getReservation(reservationId);
    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    await this.inventoryRepository.cancelReservation(reservationId);
  }

  /**
   * Release expired reservations
   */
  async releaseExpired(): Promise<number> {
    return this.inventoryRepository.releaseExpiredReservations();
  }
}
