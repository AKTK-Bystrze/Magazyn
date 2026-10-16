import * as React from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { ReservationListItem } from "@/types";
import { useTableSort } from "@/lib/hooks/useTableSort";
import { useInfiniteScrollTrigger } from "@/lib/hooks/useInfiniteScrollTrigger";
import { SkeletonRow, EmptyState } from "./ReservationTableStates";
import { ReservationTableHeader } from "./ReservationTableHeader";
import { ReservationTableRow } from "./ReservationTableRow";

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
                  mode={mode}
                  scope={scope}
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
