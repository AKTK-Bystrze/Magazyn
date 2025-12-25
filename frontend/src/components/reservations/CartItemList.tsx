import * as React from "react";
import type { CartItem as CartItemType } from "@/types/reservation-cart.types";
import { CartItem } from "./CartItem";
import { ShoppingCart } from "lucide-react";
import { ROUTES } from "@/lib/config/routes";

/**
 * Props for CartItemList component
 */
interface CartItemListProps {
  /** Cart items to display */
  items: CartItemType[];
  /** Callback when removing an item */
  onRemoveItem: (equipmentId: string) => void;
  /** Path to equipment browse page. Defaults to public equipment page. */
  equipmentBrowsePath?: string;
}

/**
 * Displays the list of equipment items in the reservation cart.
 * Shows empty state when no items are present.
 *
 * @param props - Component props
 * @returns Cart item list or empty state
 */
export function CartItemList({
  items,
  onRemoveItem,
  equipmentBrowsePath = ROUTES.PUBLIC.EQUIPMENT,
}: CartItemListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-muted rounded-lg" data-testid="cart-empty-state">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Your cart is empty
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          Browse equipment and add items to your cart to create a reservation.
        </p>
        <a
          href={equipmentBrowsePath}
          className="mt-6 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Browse Equipment
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Cart Items ({items.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <CartItem
            key={item.equipmentId}
            item={item}
            onRemove={onRemoveItem}
          />
        ))}
      </div>
    </div>
  );
}
