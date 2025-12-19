import * as React from "react";
import { type EquipmentSearchItem } from "@/types";
import { EquipmentCard } from "./EquipmentCard";
import { Skeleton } from "@/components/ui/skeleton";

interface EquipmentGridProps {
  items: EquipmentSearchItem[];
  isLoading?: boolean;
  error?: Error | null;
  onViewDetail?: (item: EquipmentSearchItem) => void;
}

export function EquipmentGrid({ items, isLoading, error, onViewDetail }: EquipmentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-destructive bg-destructive/10 rounded-lg">
        <h3 className="text-lg font-semibold">Error loading equipment</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-lg">
        <div className="rounded-full bg-muted p-4 mb-4">
          {/* Icon placeholder */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-muted-foreground">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">No equipment found</h3>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <EquipmentCard key={item.id} item={item} onViewDetail={onViewDetail} />
      ))}
    </div>
  );
}
