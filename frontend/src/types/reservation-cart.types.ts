/**
 * Types for the Reservation Cart view
 * Handles cart state, validation, cost calculations, and availability checking
 */

/**
 * Cart item stored in sessionStorage
 * Simplified version of Equipment for cart management
 */
export interface CartItem {
  equipmentId: string;
  name: string;
  typeName: string;
  description: string | null;
  creditCostPerDay: number;
  imageUrl: string | null;
}

/**
 * Cart state persisted in sessionStorage
 */
export interface CartState {
  items: CartItem[];
  startDate: string | null; // YYYY-MM-DD format
  endDate: string | null; // YYYY-MM-DD format
}

/**
 * Individual item cost calculation
 */
export interface ItemCost {
  equipmentId: string;
  name: string;
  days: number;
  creditCostPerDay: number;
  totalCost: number;
}

/**
 * Cost breakdown for display and validation
 */
export interface CostBreakdown {
  itemCosts: ItemCost[];
  totalCreditCost: number;
  currentBalance: number;
  remainingBalance: number;
}

/**
 * Date range validation errors
 */
export interface DateRangeValidationErrors {
  startDate: string | null;
  endDate: string | null;
}

/**
 * Availability check result for all cart items
 */
export interface AvailabilityCheckResult {
  isAllAvailable: boolean;
  unavailableItems: Array<{
    equipmentId: string;
    name: string;
    reason: string;
    conflictingReservations: Array<{
      startDate: string;
      endDate: string;
    }>;
  }>;
}

/**
 * Validation state for the entire cart
 */
export interface CartValidation {
  isValid: boolean;
  errors: {
    dateRange: DateRangeValidationErrors;
    availability: string | null;
    creditBalance: string | null;
    general: string | null;
  };
}
