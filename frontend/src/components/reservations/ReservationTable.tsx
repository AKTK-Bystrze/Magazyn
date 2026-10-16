import * as React from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import type { ReservationListItem } from "@/types";
import { useTableSort } from "@/lib/hooks/useTableSort";
import { useInfiniteScrollTrigger } from "@/lib/hooks/useInfiniteScrollTrigger";
import { ReservationTableHeader } from "./ReservationTableHeader";
import { ReservationTableRow } from "./ReservationTableRow";

function SkeletonRow() {
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

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
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

/**
 * Props for the ReservationTable component
 */
interface ReservationTableProps {
  reservations: ReservationListItem[];
  isLoading: boolean;
  hasFilters: boolean;
  mode: "user" | "admin";
  scope: "my" | "all";
  currentUserId?: string;
  onModify?: (reservation: ReservationListItem) => void;
  onCancel?: (reservation: ReservationListItem) => void;
  onReturn?: (reservation: ReservationListItem) => void;
  onViewDetails: (reservation: ReservationListItem) => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

/**
 * Data table displaying reservation list with columns for equipment, status, dates, and actions.
 * Supports sorting, infinite scrolling, responsive mobile and desktop rows, and action menus.
 */
export function ReservationTable({
  reservations,
  isLoading,
  hasFilters,
  mode,
  scope,
  currentUserId,
  onModify,
  onCancel,
  onReturn,
  onViewDetails,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: ReservationTableProps) {
  const observerTarget = useInfiniteScrollTrigger<HTMLTableRowElement>({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const {
    sortConfig,
    requestSort,
    sortedData: sortedReservations,
  } = useTableSort(reservations, {
    getValue: (item, key) => {
      if (key === "dates") return item.startDate;
      return item[key as keyof ReservationListItem];
    },
  });

  const showUserColumn = mode === "admin" || scope === "all";

  return (
    <div className="rounded-md border overflow-x-auto bg-card w-full max-w-full mt-6">
      <Table>
        <ReservationTableHeader
          showUserColumn={showUserColumn}
          sortConfig={sortConfig}
          requestSort={requestSort}
        />
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={`skeleton-${index}`} />)
          ) : sortedReservations.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <>
              {sortedReservations.map((item) => (
                <ReservationTableRow
                  key={item.id}
                  item={item}
                  showUserColumn={showUserColumn}
                  currentUserId={currentUserId}
                  onViewDetails={onViewDetails}
                  onModify={onModify}
                  onCancel={onCancel}
                  onReturn={onReturn}
                />
              ))}

              <TableRow ref={observerTarget}>
                <TableCell
                  colSpan={showUserColumn ? 8 : 7}
                  className="hidden md:table-cell h-10 text-center p-0 border-0"
                >
                  {isFetchingNextPage && (
                    <span className="text-sm text-muted-foreground block py-2">
                      Ładowanie kolejnych...
                    </span>
                  )}
                </TableCell>
                <TableCell
                  colSpan={showUserColumn ? 5 : 4}
                  className="md:hidden h-10 text-center p-0 border-0"
                >
                  {isFetchingNextPage && (
                    <span className="text-sm text-muted-foreground block py-2">
                      Ładowanie kolejnych...
                    </span>
                  )}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
