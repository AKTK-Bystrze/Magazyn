import * as React from "react";
import { type EquipmentSearchItem } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { saveCartToStorage, loadCartFromStorage } from "@/lib/utils/cart-storage";
import type { CartItem } from "@/types/reservation-cart.types";

interface EquipmentCardProps {
  item: EquipmentSearchItem;
}

export function EquipmentCard({ item }: EquipmentCardProps) {
  const [addedToCart, setAddedToCart] = React.useState(false);
  const [alreadyInCart, setAlreadyInCart] = React.useState(false);

  const isAvailable = item.status === "ok";
  const statusColor = item.status === "ok" ? "bg-green-500" : item.status === "broken" ? "bg-destructive" : "bg-yellow-500";
  const statusLabel = item.status === "ok" ? "Available" : item.status === "broken" ? "Broken" : "Blocked";

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      equipmentId: item.id,
      name: item.name,
      typeName: item.type.name,
      description: item.description,
      creditCostPerDay: item.type.creditCostPerDay,
      imageUrl: item.imagePath,
    };

    const currentCart = loadCartFromStorage() || { items: [], startDate: null, endDate: null };

    // Check if already in cart
    if (currentCart.items.some(i => i.equipmentId === cartItem.equipmentId)) {
      setAlreadyInCart(true);
      setTimeout(() => setAlreadyInCart(false), 3000);
      return;
    }

    currentCart.items.push(cartItem);
    saveCartToStorage(currentCart);

    // Dispatch event for UI updates (for potential navbar badge)
    window.dispatchEvent(new Event('cart-updated'));

    // Show success feedback
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
      <div className="relative">
        <AspectRatio ratio={4 / 3} className="bg-muted">
          {item.imagePath ? (
            <img
              src={item.imagePath}
              alt={item.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder-equipment.svg"; // Fallback
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </AspectRatio>
        <Badge
          className={cn("absolute top-2 right-2 text-white hover:bg-opacity-80 active:bg-opacity-80", statusColor)}
        >
          {statusLabel}
        </Badge>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
            <p className="text-sm text-muted-foreground">{item.type.name}</p>
          </div>
          {/* Placeholder for US-008 Favorite Button */}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 flex-grow">
        <p className="text-sm text-gray-600 line-clamp-2">
          {item.description || "No description provided."}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center border-t bg-muted/20 mt-auto gap-2">
        <div className="flex items-center gap-1 font-medium bg-secondary px-2 py-1 rounded">
          <span className="text-primary">{item.type.creditCostPerDay}</span>
          <span className="text-xs text-muted-foreground">credits/day</span>
        </div>
        <div className="flex gap-2">
          {isAvailable && (
            <Button
              size="sm"
              variant={addedToCart ? "default" : alreadyInCart ? "destructive" : "outline"}
              onClick={handleAddToCart}
              title={addedToCart ? "Added to cart!" : alreadyInCart ? "Already in cart" : "Add to Cart"}
              disabled={addedToCart}
              className={cn(
                "transition-all duration-300",
                addedToCart && "bg-green-600 hover:bg-green-600"
              )}
            >
              {addedToCart ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Added!
                </>
              ) : alreadyInCart ? (
                <>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  In Cart
                </>
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
            </Button>
          )}
          <a
            href={`/equipment/${item.id}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
          >
            Details
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
