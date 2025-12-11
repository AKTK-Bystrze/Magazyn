import { useState, useEffect, useCallback } from "react";
import type {
  CartState,
  CartItem,
  CostBreakdown,
} from "@/types/reservation-cart.types";
import {
  saveCartToStorage,
  loadCartFromStorage,
  clearCartFromStorage,
} from "@/lib/utils/cart-storage";
import { calculateCost } from "@/lib/utils/cart-validation";

/**
 * Custom hook for reservation cart management
 * Handles sessionStorage persistence, validation, and cart operations
 *
 * @param initialCreditBalance - User's current credit balance
 * @returns Cart state and operations
 */
export function useReservationCart(initialCreditBalance: number) {
  const [cartState, setCartState] = useState<CartState>(() => {
    const saved = loadCartFromStorage();
    return (
      saved || {
        items: [],
        startDate: null,
        endDate: null,
      }
    );
  });

  useEffect(() => {
    saveCartToStorage(cartState);
  }, [cartState]);

  const addItem = useCallback((item: CartItem) => {
    setCartState((prev) => {
      const exists = prev.items.some((i) => i.equipmentId === item.equipmentId);
      if (exists) {
        return prev;
      }
      return {
        ...prev,
        items: [...prev.items, item],
      };
    });
  }, []);

  const removeItem = useCallback((equipmentId: string) => {
    setCartState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.equipmentId !== equipmentId),
    }));
  }, []);

  const updateStartDate = useCallback((date: string) => {
    setCartState((prev) => ({
      ...prev,
      startDate: date,
    }));
  }, []);

  const updateEndDate = useCallback((date: string) => {
    setCartState((prev) => ({
      ...prev,
      endDate: date,
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCartState({
      items: [],
      startDate: null,
      endDate: null,
    });
    clearCartFromStorage();
  }, []);

  const calculateCartCost = useCallback((): CostBreakdown | null => {
    if (
      !cartState.startDate ||
      !cartState.endDate ||
      cartState.items.length === 0
    ) {
      return null;
    }
    return calculateCost(
      cartState.items,
      cartState.startDate,
      cartState.endDate,
      initialCreditBalance
    );
  }, [cartState, initialCreditBalance]);

  return {
    cartState,
    addItem,
    removeItem,
    updateStartDate,
    updateEndDate,
    clearCart,
    calculateCost: calculateCartCost,
  };
}
