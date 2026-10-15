import { describe, it, expect } from "vitest";
import { calculateCost, validateCart } from "../cart-validation";
import { ERROR_INSUFFICIENT_CREDITS } from "@/lib/config/constants";
import type { CartState, CartItem, AvailabilityCheckResult } from "@/types/reservation-cart.types";

describe("Adversarial Stress Test: calculateCost & validateCart", () => {
  const futureDate = (daysFromNow: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split("T")[0];
  };

  const sampleAvailable: AvailabilityCheckResult = {
    isAllAvailable: true,
    unavailableItems: [],
  };

  const sampleUnavailable: AvailabilityCheckResult = {
    isAllAvailable: false,
    unavailableItems: [
      {
        equipmentId: "eq-unavail",
        name: "Unavailable Item",
        reason: "Already booked",
        conflictingReservations: [],
      },
    ],
  };

  describe("0 items in cart (empty cart)", () => {
    it("calculateCost with 0 items produces 0 total cost and unchanged balance", () => {
      const paidBreakdown = calculateCost([], "2026-11-01", "2026-11-05", 250, false);
      expect(paidBreakdown.itemCosts).toEqual([]);
      expect(paidBreakdown.totalCreditCost).toBe(0);
      expect(paidBreakdown.currentBalance).toBe(250);
      expect(paidBreakdown.remainingBalance).toBe(250);
      expect(paidBreakdown.isFreeReservation).toBeUndefined();

      const freeBreakdown = calculateCost([], "2026-11-01", "2026-11-05", 250, true);
      expect(freeBreakdown.itemCosts).toEqual([]);
      expect(freeBreakdown.totalCreditCost).toBe(0);
      expect(freeBreakdown.currentBalance).toBe(250);
      expect(freeBreakdown.remainingBalance).toBe(250);
      expect(freeBreakdown.isFreeReservation).toBe(true);
    });

    it("validateCart rejects empty cart even when isFreeReservation is true", () => {
      const emptyCartState: CartState = {
        items: [],
        startDate: futureDate(5),
        endDate: futureDate(7),
      };
      const cost = calculateCost([], futureDate(5), futureDate(7), 500, true);

      const validation = validateCart(emptyCartState, sampleAvailable, cost, true);
      expect(validation.isValid).toBe(false);
    });

    it("validateCart rejects empty cart when isFreeReservation is false", () => {
      const emptyCartState: CartState = {
        items: [],
        startDate: futureDate(5),
        endDate: futureDate(7),
      };
      const cost = calculateCost([], futureDate(5), futureDate(7), 500, false);

      const validation = validateCart(emptyCartState, sampleAvailable, cost, false);
      expect(validation.isValid).toBe(false);
    });
  });

  describe("Free reservations with expensive equipment", () => {
    const expensiveItems: CartItem[] = [
      {
        equipmentId: "arri-alexa-35",
        name: "ARRI Alexa 35 Cinema Camera Package",
        typeName: "Camera",
        description: "High-end cinema camera package",
        creditCostPerDay: 50_000,
        imageUrl: null,
      },
      {
        equipmentId: "cooke-anamorphic-set",
        name: "Cooke Anamorphic /i Full Frame Plus Set",
        typeName: "Lens",
        description: "Full set of anamorphic primes",
        creditCostPerDay: 30_000,
        imageUrl: null,
      },
    ];

    it("zeroes out costs for expensive multi-item equipment when isFreeReservation is true", () => {
      // 10 days inclusive: 2026-12-01 to 2026-12-10 (10 days)
      const startDate = "2026-12-01";
      const endDate = "2026-12-10";
      const userBalance = 10; // User has almost no credits

      // Standard paid calculation would cost (50,000 + 30,000) * 10 = 800,000 credits
      const paidBreakdown = calculateCost(expensiveItems, startDate, endDate, userBalance, false);
      expect(paidBreakdown.totalCreditCost).toBe(800_000);
      expect(paidBreakdown.remainingBalance).toBe(10 - 800_000);
      expect(paidBreakdown.itemCosts[0].totalCost).toBe(500_000);
      expect(paidBreakdown.itemCosts[1].totalCost).toBe(300_000);

      // Free reservation calculation
      const freeBreakdown = calculateCost(expensiveItems, startDate, endDate, userBalance, true);
      expect(freeBreakdown.totalCreditCost).toBe(0);
      expect(freeBreakdown.currentBalance).toBe(10);
      expect(freeBreakdown.remainingBalance).toBe(10);
      expect(freeBreakdown.itemCosts[0].totalCost).toBe(0);
      expect(freeBreakdown.itemCosts[0].days).toBe(10);
      expect(freeBreakdown.itemCosts[0].creditCostPerDay).toBe(50_000);
      expect(freeBreakdown.itemCosts[1].totalCost).toBe(0);
      expect(freeBreakdown.isFreeReservation).toBe(true);
    });

    it("validates successfully for expensive equipment with 0 balance when free", () => {
      const cartState: CartState = {
        items: expensiveItems,
        startDate: futureDate(10),
        endDate: futureDate(15),
      };
      const freeCost = calculateCost(expensiveItems, futureDate(10), futureDate(15), 0, true);

      const validation = validateCart(cartState, sampleAvailable, freeCost, true);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.creditBalance).toBeNull();
    });

    it("fails validation for expensive equipment with insufficient balance when paid", () => {
      const cartState: CartState = {
        items: expensiveItems,
        startDate: futureDate(10),
        endDate: futureDate(15),
      };
      const paidCost = calculateCost(expensiveItems, futureDate(10), futureDate(15), 0, false);

      const validation = validateCart(cartState, sampleAvailable, paidCost, false);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.creditBalance).not.toBeNull();
    });
  });

  describe("Multi-item carts with diverse credit rates", () => {
    const mixedItems: CartItem[] = [
      {
        equipmentId: "free-cable",
        name: "HDMI Cable (complimentary)",
        typeName: "Accessory",
        description: null,
        creditCostPerDay: 0,
        imageUrl: null,
      },
      {
        equipmentId: "cheap-battery",
        name: "V-Mount Battery",
        typeName: "Power",
        description: null,
        creditCostPerDay: 15,
        imageUrl: null,
      },
      {
        equipmentId: "mid-lighting",
        name: "Aputure 600d Light",
        typeName: "Lighting",
        description: null,
        creditCostPerDay: 85,
        imageUrl: null,
      },
    ];

    it("correctly calculates per-item and total cost across 4 days", () => {
      // 4 days inclusive (Nov 10 to Nov 13)
      const breakdown = calculateCost(mixedItems, "2026-11-10", "2026-11-13", 500, false);

      expect(breakdown.itemCosts).toHaveLength(3);
      expect(breakdown.itemCosts[0].totalCost).toBe(0); // 0 * 4
      expect(breakdown.itemCosts[1].totalCost).toBe(60); // 15 * 4
      expect(breakdown.itemCosts[2].totalCost).toBe(340); // 85 * 4
      expect(breakdown.totalCreditCost).toBe(400); // 0 + 60 + 340
      expect(breakdown.currentBalance).toBe(500);
      expect(breakdown.remainingBalance).toBe(100);
    });

    it("single day rental (startDate === endDate) calculates exactly 1 day duration", () => {
      const breakdown = calculateCost(mixedItems, "2026-11-10", "2026-11-10", 200, false);

      expect(breakdown.itemCosts[0].days).toBe(1);
      expect(breakdown.itemCosts[0].totalCost).toBe(0);
      expect(breakdown.itemCosts[1].totalCost).toBe(15);
      expect(breakdown.itemCosts[2].totalCost).toBe(85);
      expect(breakdown.totalCreditCost).toBe(100);
      expect(breakdown.remainingBalance).toBe(100);
    });
  });

  describe("Credit boundary conditions", () => {
    const singleItem: CartItem[] = [
      {
        equipmentId: "eq-test",
        name: "Test Light",
        typeName: "Lighting",
        description: null,
        creditCostPerDay: 50,
        imageUrl: null,
      },
    ];

    it("exact credit balance (cost === balance) results in remainingBalance 0 and valid cart", () => {
      // 2 days = 100 credits, balance = 100
      const cost = calculateCost(singleItem, "2026-11-10", "2026-11-11", 100, false);
      expect(cost.totalCreditCost).toBe(100);
      expect(cost.remainingBalance).toBe(0);

      const cartState: CartState = {
        items: singleItem,
        startDate: futureDate(3),
        endDate: futureDate(4),
      };
      const validation = validateCart(cartState, sampleAvailable, cost, false);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.creditBalance).toBeNull();
    });

    it("one credit short (balance = cost - 1) results in remainingBalance -1 and invalid cart", () => {
      const cost = calculateCost(singleItem, "2026-11-10", "2026-11-11", 99, false);
      expect(cost.totalCreditCost).toBe(100);
      expect(cost.remainingBalance).toBe(-1);

      const cartState: CartState = {
        items: singleItem,
        startDate: futureDate(3),
        endDate: futureDate(4),
      };
      const validation = validateCart(cartState, sampleAvailable, cost, false);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.creditBalance).toBe(ERROR_INSUFFICIENT_CREDITS(1));
    });

    it("user with negative initial balance (-50) cannot book paid reservation", () => {
      const cost = calculateCost(singleItem, "2026-11-10", "2026-11-11", -50, false);
      expect(cost.totalCreditCost).toBe(100);
      expect(cost.remainingBalance).toBe(-150);

      const cartState: CartState = {
        items: singleItem,
        startDate: futureDate(3),
        endDate: futureDate(4),
      };
      const validation = validateCart(cartState, sampleAvailable, cost, false);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.creditBalance).toBe(ERROR_INSUFFICIENT_CREDITS(150));
    });

    it("user with negative initial balance (-50) CAN book free reservation via admin", () => {
      const cost = calculateCost(singleItem, "2026-11-10", "2026-11-11", -50, true);
      expect(cost.totalCreditCost).toBe(0);
      expect(cost.remainingBalance).toBe(-50);
      expect(cost.isFreeReservation).toBe(true);

      const cartState: CartState = {
        items: singleItem,
        startDate: futureDate(3),
        endDate: futureDate(4),
      };
      // validateCart checks hasSufficientCredits = isFreeReservation || remainingBalance >= 0
      const validation = validateCart(cartState, sampleAvailable, cost, true);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.creditBalance).toBeNull();
    });

    it("unavailable items still invalidate cart even if isFreeReservation is true", () => {
      const cost = calculateCost(singleItem, "2026-11-10", "2026-11-11", 100, true);
      const cartState: CartState = {
        items: singleItem,
        startDate: futureDate(3),
        endDate: futureDate(4),
      };
      const validation = validateCart(cartState, sampleUnavailable, cost, true);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.availability).not.toBeNull();
    });

    it("past dates still invalidate cart even if isFreeReservation is true", () => {
      const cost = calculateCost(singleItem, "2020-01-01", "2020-01-05", 100, true);
      const cartState: CartState = {
        items: singleItem,
        startDate: "2020-01-01",
        endDate: "2020-01-05",
      };
      const validation = validateCart(cartState, sampleAvailable, cost, true);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.dateRange.startDate).not.toBeNull();
    });
  });
});
