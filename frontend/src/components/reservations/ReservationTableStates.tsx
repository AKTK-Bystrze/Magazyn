import * as React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

/**
 * Loading skeleton row component for reservation table.
 */
export function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="h-4 w-12" />
      </TableCell>
      <TableCell className="hidden xl:table-cell">
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8" />
      </TableCell>
    </TableRow>
  );
}

/**
 * Empty state component when no reservations match criteria.
 */
export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const title = hasFilters ? "Brak rezerwacji spełniających kryteria" : "Brak rezerwacji";
  const description = hasFilters
    ? "Spróbuj zmienić filtry wyszukiwania."
    : "Twoje rezerwacje pojawią się tutaj.";

  return (
    <TableRow>
      <TableCell colSpan={8} className="h-32 text-center">
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Calendar className="h-8 w-8 opacity-20" />
          <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm">{description}</p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
