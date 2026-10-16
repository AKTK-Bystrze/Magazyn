import { describe, it, expect } from "vitest";
import { validateCart, calculateCost } from "./cart-validation";
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

  it.each([
    ["insufficient credits and paid reservation", insufficientCredits, false, false],
    ["insufficient credits and free reservation", insufficientCredits, true, true],
    ["sufficient credits and paid reservation", sufficientCredits, false, true],
    ["sufficient credits and free reservation", sufficientCredits, true, true],
  ])("validates %s", (_, credits, isFree, expectedValid) => {
    const result = validateCart(validCartState, allAvailable, credits, isFree);
    expect(result.isValid).toBe(expectedValid);
    if (expectedValid) {
      expect(result.errors.creditBalance).toBeNull();
    } else {
      expect(result.errors.creditBalance).not.toBeNull();
    }
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

describe("calculateCost", () => {
  const items = [
    {
      equipmentId: "eq-1",
      name: "Camera A",
      typeName: "Camera",
      description: null,
      creditCostPerDay: 10,
      imageUrl: null,
    },
    {
      equipmentId: "eq-2",
      name: "Tripod",
      typeName: "Support",
      description: null,
      creditCostPerDay: 5,
      imageUrl: null,
    },
  ];

  it("calculates cost accurately for normal reservations", () => {
    // 3 days inclusive (Jan 10 to Jan 12)
    const breakdown = calculateCost(items, "2025-01-10", "2025-01-12", 100, false);

    expect(breakdown.itemCosts).toHaveLength(2);
    expect(breakdown.itemCosts[0].totalCost).toBe(30); // 10 * 3
    expect(breakdown.itemCosts[1].totalCost).toBe(15); // 5 * 3
    expect(breakdown.totalCreditCost).toBe(45);
    expect(breakdown.currentBalance).toBe(100);
    expect(breakdown.remainingBalance).toBe(55);
    expect(breakdown.isFreeReservation).toBeUndefined();
  });

  it("calculates cost as 0 for free reservations", () => {
    const breakdown = calculateCost(items, "2025-01-10", "2025-01-12", 20, true);

    expect(breakdown.itemCosts).toHaveLength(2);
    expect(breakdown.itemCosts[0].totalCost).toBe(0);
    expect(breakdown.itemCosts[1].totalCost).toBe(0);
    expect(breakdown.totalCreditCost).toBe(0);
    expect(breakdown.currentBalance).toBe(20);
    expect(breakdown.remainingBalance).toBe(20);
    expect(breakdown.isFreeReservation).toBe(true);
  });
});
