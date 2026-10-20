import { describe, it, expect } from "vitest";
import { validateCart, calculateCost } from "./cart-validation";
import type {
  CartState,
  CostBreakdown,
  AvailabilityCheckResult,
} from "@/types/reservation-cart.types";
import { ERROR_START_DATE_PAST, ERROR_END_DATE_BEFORE_START } from "@/lib/config/constants";

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

  it("rejects reservations with startDate in the past", () => {
    const pastCart: CartState = {
      ...validCartState,
      startDate: futureDate(-1),
      endDate: futureDate(2),
    };

    const result = validateCart(pastCart, allAvailable, sufficientCredits, false);

    expect(result.isValid).toBe(false);
    expect(result.errors.dateRange.startDate).toBe(ERROR_START_DATE_PAST);
  });

  it("rejects reservations where startDate is after endDate", () => {
    const backwardsCart: CartState = {
      ...validCartState,
      startDate: futureDate(4),
      endDate: futureDate(2),
    };

    const result = validateCart(backwardsCart, allAvailable, sufficientCredits, false);

    expect(result.isValid).toBe(false);
    expect(result.errors.dateRange.endDate).toBe(ERROR_END_DATE_BEFORE_START);
  });

  it("validates date ranges across month boundaries", () => {
    const monthBoundaryCart: CartState = {
      ...validCartState,
      startDate: "2026-10-31",
      endDate: "2026-11-02",
    };

    const result = validateCart(monthBoundaryCart, allAvailable, sufficientCredits, false);

    expect(result.errors.dateRange.startDate).toBeNull();
    expect(result.errors.dateRange.endDate).toBeNull();
  });

  it("validates date ranges across leap year boundary (Feb 28 to Mar 1, 2028)", () => {
    const leapYearCart: CartState = {
      ...validCartState,
      startDate: "2028-02-28",
      endDate: "2028-03-01",
    };

    const result = validateCart(leapYearCart, allAvailable, sufficientCredits, false);

    expect(result.errors.dateRange.startDate).toBeNull();
    expect(result.errors.dateRange.endDate).toBeNull();
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

  it("calculates 1 day cost for same-day reservation (startDate === endDate)", () => {
    const breakdown = calculateCost(items, "2026-05-10", "2026-05-10", 100, false);

    expect(breakdown.itemCosts[0].days).toBe(1);
    expect(breakdown.totalCreditCost).toBe(15);
    expect(breakdown.remainingBalance).toBe(85);
  });

  it("calculates correct days across month boundary (Oct 30 to Nov 1 = 3 days)", () => {
    const breakdown = calculateCost(items, "2026-10-30", "2026-11-01", 100, false);

    expect(breakdown.itemCosts[0].days).toBe(3);
    expect(breakdown.totalCreditCost).toBe(45);
  });

  it("calculates correct days across year boundary (Dec 30 to Jan 2 = 4 days)", () => {
    const breakdown = calculateCost(items, "2026-12-30", "2027-01-02", 100, false);

    expect(breakdown.itemCosts[0].days).toBe(4);
    expect(breakdown.totalCreditCost).toBe(60);
  });

  it("calculates correct days across autumn daylight saving time transition", () => {
    const breakdown = calculateCost(items, "2026-10-24", "2026-10-26", 100, false);

    expect(breakdown.itemCosts[0].days).toBe(3);
    expect(breakdown.totalCreditCost).toBe(45);
  });

  it("calculates correct days across spring daylight saving time transition", () => {
    const breakdown = calculateCost(items, "2026-03-28", "2026-03-30", 100, false);

    expect(breakdown.itemCosts[0].days).toBe(3);
    expect(breakdown.totalCreditCost).toBe(45);
  });

  it("calculates correct days across leap year (Feb 28 to Mar 1, 2028 = 3 days)", () => {
    const breakdown = calculateCost(items, "2028-02-28", "2028-03-01", 100, false);

    expect(breakdown.itemCosts[0].days).toBe(3);
    expect(breakdown.totalCreditCost).toBe(45);
  });
});
