import * as React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { loadCartFromStorage } from "@/lib/utils/cart-storage";
import { ROUTES } from "@/lib/config/routes";
import { pluralize } from "@/lib/utils/text-utils";

/**
 * Floating cart indicator that shows when items are in the cart
 * Displays item count and provides navigation to reservation creation
 */
export function CartIndicator() {
  const [itemCount, setItemCount] = React.useState(0);

  // Load cart count on mount and listen for updates
  React.useEffect(() => {
    const updateCount = () => {
      const cart = loadCartFromStorage();
      setItemCount(cart?.items?.length ?? 0);
    };

    // Initial load
    updateCount();

    // Listen for cart updates (dispatched from EquipmentCard)
    window.addEventListener("cart-updated", updateCount);
    window.addEventListener("storage", updateCount);

    return () => {
      window.removeEventListener("cart-updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  // Don't render if cart is empty
  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <a href={ROUTES.PROTECTED.RESERVATIONS_CREATE}>
        <Button
          size="lg"
          className="shadow-lg hover:shadow-xl transition-shadow gap-2 pr-4"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <span className="ml-2">
            {itemCount} {pluralize(itemCount, "item")} in cart
          </span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </a>
    </div>
  );
}
