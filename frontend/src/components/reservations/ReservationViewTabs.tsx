import { cn } from "@/lib/utils";

/**
 * Scope type for reservation views
 */
export type ReservationScope = "my" | "all";

interface ReservationViewTabsProps {
  activeScope: ReservationScope;
  onScopeChange: (scope: ReservationScope) => void;
}

/**
 * Tab navigation for switching between "My Reservations" and "All Reservations" views
 * Updates URL query param for shareable links
 */
export function ReservationViewTabs({
  activeScope,
  onScopeChange,
}: ReservationViewTabsProps) {
  return (
    <div className="flex border-b border-border mb-4">
      <button
        type="button"
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
          activeScope === "my"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onScopeChange("my")}
        aria-selected={activeScope === "my"}
        role="tab"
      >
        Moje Rezerwacje
      </button>
      <button
        type="button"
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
          activeScope === "all"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onScopeChange("all")}
        aria-selected={activeScope === "all"}
        role="tab"
      >
        Wszystkie Rezerwacje
      </button>
    </div>
  );
}
