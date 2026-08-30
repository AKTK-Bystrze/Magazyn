import { describe, it, expect } from "vitest";
import { validateCart } from "./cart-validation";
import type {
  CartState,
  CostBreakdown,
  AvailabilityCheckResult,
} from "@/types/reservation-cart.types";

/**
 * Unit tests for validateCart.
 *
 * Focuses on the isFreeReservation flag which bypasses the credit check,
 * allowing reservations to be created regardless of available balance.
 */
describe("validateCart", () => {
  const futureDate = (daysFromNow: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split("T")[0];
  };

  const validCartState: CartState = {
    items: [
      {
        equipmentId: "eq-1",
        name: "Camera A",
        typeName: "Camera",
        description: null,
        creditCostPerDay: 10,
        imageUrl: null,
      },
    ],
    startDate: futureDate(2),
    endDate: futureDate(4),
  };

  const allAvailable: AvailabilityCheckResult = {
    isAllAvailable: true,
    unavailableItems: [],
  };

  const insufficientCredits: CostBreakdown = {
    itemCosts: [],
    totalCreditCost: 50,
    currentBalance: 30,
    remainingBalance: -20,
  };

  const sufficientCredits: CostBreakdown = {
    itemCosts: [],
    totalCreditCost: 10,
    currentBalance: 100,
    remainingBalance: 90,
  };

  it("returns invalid when remainingBalance < 0 and isFreeReservation is false", () => {
    const result = validateCart(validCartState, allAvailable, insufficientCredits, false);

    expect(result.isValid).toBe(false);
    expect(result.errors.creditBalance).not.toBeNull();
  });

  it("returns valid when remainingBalance < 0 but isFreeReservation is true", () => {
    const result = validateCart(validCartState, allAvailable, insufficientCredits, true);

    expect(result.isValid).toBe(true);
    expect(result.errors.creditBalance).toBeNull();
  });

  it("returns valid when credits are sufficient regardless of isFreeReservation", () => {
    const resultPaid = validateCart(validCartState, allAvailable, sufficientCredits, false);
    const resultFree = validateCart(validCartState, allAvailable, sufficientCredits, true);

    expect(resultPaid.isValid).toBe(true);
    expect(resultPaid.errors.creditBalance).toBeNull();
    expect(resultFree.isValid).toBe(true);
    expect(resultFree.errors.creditBalance).toBeNull();
  });

  it("returns invalid when cart is empty", () => {
    const emptyCart: CartState = { ...validCartState, items: [] };

    const result = validateCart(emptyCart, allAvailable, sufficientCredits, false);

    expect(result.isValid).toBe(false);
  });

  it("returns invalid when dates are missing", () => {
    const noDates: CartState = { ...validCartState, startDate: null, endDate: null };

    const result = validateCart(noDates, allAvailable, sufficientCredits, false);

    expect(result.isValid).toBe(false);
  });
});
