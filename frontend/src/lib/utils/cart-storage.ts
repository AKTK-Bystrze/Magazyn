import type { CartState } from "@/types/reservation-cart.types";
import { cartStateSchema } from "@/lib/validators/cart.validator";
import { STORAGE_KEY_CART } from "@/lib/config/constants";

const CART_STORAGE_KEY = STORAGE_KEY_CART;

/**
 * Saves the cart state to sessionStorage
 *
 * @param cart - The cart state to save
 */
export function saveCartToStorage(cart: CartState): void {
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Failed to save cart to sessionStorage:", error);
  }
}

/**
 * Loads the cart state from sessionStorage
 * Validates the data using Zod to ensure type safety
 *
 * @returns The cart state or null if not found or invalid
 */
export function loadCartFromStorage(): CartState | null {
  try {
    const data = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    const validated = cartStateSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("Invalid cart data in sessionStorage:", validated.error.format());
      return null;
    }

    return validated.data;
  } catch (error) {
    console.error("Failed to load cart from sessionStorage:", error);
    return null;
  }
}

/**
 * Clears the cart from sessionStorage
 */
export function clearCartFromStorage(): void {
  sessionStorage.removeItem(CART_STORAGE_KEY);
}
