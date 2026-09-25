import * as React from "react";
import { type EquipmentSearchItem } from "@/types";
import { EquipmentCard } from "./EquipmentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultLogger as logger } from "@/lib/utils/logger";

interface EquipmentGridProps {
  items: EquipmentSearchItem[];
  isLoading?: boolean;
  error?: Error | null;
  onViewDetail?: (item: EquipmentSearchItem) => void;
  viewMode?: "grid" | "list";
}

export function EquipmentGrid({
  items,
  isLoading,
  error,
  onViewDetail,
  viewMode = "grid",
}: EquipmentGridProps) {
  if (isLoading) {
    return (
      <div
        className={viewMode === "grid" ? "grid gap-6" : "flex flex-col gap-4"}
        style={
          viewMode === "grid"
            ? { gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }
            : undefined
        }
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex ${viewMode === "grid" ? "flex-col space-y-3" : "flex-row space-x-4 space-y-0 p-4 border rounded-xl"}`}
          >
            {viewMode === "grid" && <Skeleton className="h-[200px] w-full rounded-xl" />}
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    logger.error("EquipmentSearchContainer Error:", error);
    return (
      <div
        className="flex flex-col items-center justify-center p-12 text-center text-destructive bg-destructive/10 rounded-lg"
        data-testid="equipment-grid-error"
      >
        <h3 className="text-lg font-semibold">Błąd ładowania sprzętu</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-lg"
        data-testid="equipment-grid-empty"
      >
        <div className="rounded-full bg-muted p-4 mb-4">
          {/* Icon placeholder */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 text-muted-foreground"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Nie znaleziono sprzętu</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Spróbuj dostosować wyszukiwanie lub filtry.
        </p>
      </div>
    );
  }

  return (
    <div
      className={viewMode === "grid" ? "grid gap-6" : "flex flex-col gap-4"}
      style={
        viewMode === "grid"
          ? { gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }
          : undefined
      }
      data-testid="equipment-grid"
    >
      {items.map((item) => (
        <EquipmentCard key={item.id} item={item} onViewDetail={onViewDetail} viewMode={viewMode} />
      ))}
    </div>
  );
}
