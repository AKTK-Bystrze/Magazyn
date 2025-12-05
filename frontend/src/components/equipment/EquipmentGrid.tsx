import type { Equipment } from '@/types';
import { EquipmentCard } from './EquipmentCard';

interface EquipmentGridProps {
  items: Equipment[];
  isLoading: boolean;
  error: Error | null;
}

export function EquipmentGrid({ items, isLoading, error }: EquipmentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[300px] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 border rounded-lg border-destructive/20 bg-destructive/5 text-destructive">
        <h3 className="text-lg font-semibold">Error loading equipment</h3>
        <p className="text-sm opacity-80 mt-1">{error.message || 'Something went wrong occurred while fetching data.'}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 border rounded-lg bg-muted/20">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4 text-2xl">
          🔍
        </div>
        <h3 className="text-lg font-semibold">No equipment found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <EquipmentCard key={item.id} item={item} />
      ))}
    </div>
  );
}
