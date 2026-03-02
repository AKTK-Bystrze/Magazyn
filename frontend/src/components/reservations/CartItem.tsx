import * as React from "react";
import type { CartItem } from "@/types/reservation-cart.types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { PLACEHOLDER_EQUIPMENT_IMAGE, ICON_SIZE_SM } from "@/lib/config/constants";

interface CartItemProps {
  item: CartItem;
  onRemove: (equipmentId: string) => void;
}

/**
 * Individual cart item card component
 * Displays equipment details with a remove button
 */
export function CartItem({ item, onRemove }: CartItemProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden" data-testid={`cart-item-${item.equipmentId}`}>
      <div className="relative">
        <AspectRatio ratio={16 / 9} className="bg-muted">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = PLACEHOLDER_EQUIPMENT_IMAGE;
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </AspectRatio>
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={() => onRemove(item.equipmentId)}
          aria-label={`Remove ${item.name} from cart`}
          data-testid={`cart-item-remove-${item.equipmentId}`}
        >
          <X className={ICON_SIZE_SM} />
        </Button>
      </div>

      <CardHeader className="p-4 pb-2">
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.typeName}</p>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.description || "No description provided."}
        </p>
        <div className="flex items-center gap-1 font-medium bg-secondary px-3 py-1.5 rounded-md w-fit">
          <span className="text-primary font-semibold">
            {item.creditCostPerDay}
          </span>
          <span className="text-xs text-muted-foreground">credits/day</span>
        </div>
      </CardContent>
    </Card>
  );
}
