import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, X, CornerDownLeft, Eye, Edit2 } from "lucide-react";
import { ICON_SIZE_SM, RESERVATION_STATUS } from "@/lib/config/constants";
import type { ReservationListItem } from "@/types";
import { formatDate } from "@/lib/utils/date-utils";

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

import { StatusBadge } from "./StatusBadge";

/**
 * Loading skeleton row component
 */
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

/**
 * Empty state component when no reservations are found
 */
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
 * Data table displaying reservation list with columns for equipment, status, dates, and actions
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
  const observerTarget = React.useRef<HTMLTableRowElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Action handlers
  const handleModify = (item: ReservationListItem) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onModify?.(item);
  };

  const handleCancel = (item: ReservationListItem) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.(item);
  };

  const handleReturn = (item: ReservationListItem) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onReturn?.(item);
  };

  const handleViewDetails = (item: ReservationListItem) => (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onViewDetails(item);
  };

  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedReservations = React.useMemo(() => {
    const sortableItems = [...reservations];
    if (sortConfig !== null) {
      sortableItems.sort((a: ReservationListItem, b: ReservationListItem) => {
        let aValue = a[sortConfig.key as keyof ReservationListItem];
        let bValue = b[sortConfig.key as keyof ReservationListItem];

        if (sortConfig.key === "dates") {
          aValue = a.startDate;
          bValue = b.startDate;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [reservations, sortConfig]);

  const showUserColumn = mode === "admin" || scope === "all";

  // Mobile date formatter
  const formatDateMobile = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
  };

  const renderSortIndicator = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  return (
    <div className="rounded-md border overflow-x-auto bg-card w-full max-w-full mt-6">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Mobile Header */}
            {showUserColumn && (
              <TableHead
                className="md:hidden cursor-pointer"
                onClick={() => requestSort("username")}
              >
                Użytkownik{renderSortIndicator("username")}
              </TableHead>
            )}
            <TableHead className="md:hidden cursor-pointer" onClick={() => requestSort("dates")}>
              Daty{renderSortIndicator("dates")}
            </TableHead>
            <TableHead
              className="md:hidden cursor-pointer"
              onClick={() => requestSort("equipmentName")}
            >
              Sprzęt{renderSortIndicator("equipmentName")}
            </TableHead>
            <TableHead className="md:hidden cursor-pointer" onClick={() => requestSort("status")}>
              Status{renderSortIndicator("status")}
            </TableHead>
            <TableHead className="md:hidden w-[50px]"></TableHead>

            {/* Desktop Header */}
            <TableHead
              className="hidden md:table-cell cursor-pointer"
              onClick={() => requestSort("equipmentName")}
            >
              Sprzęt{renderSortIndicator("equipmentName")}
            </TableHead>
            <TableHead
              className="hidden md:table-cell cursor-pointer"
              onClick={() => requestSort("equipmentType")}
            >
              Typ{renderSortIndicator("equipmentType")}
            </TableHead>
            <TableHead
              className="hidden md:table-cell cursor-pointer"
              onClick={() => requestSort("status")}
            >
              Status{renderSortIndicator("status")}
            </TableHead>
            <TableHead
              className="hidden md:table-cell cursor-pointer"
              onClick={() => requestSort("startDate")}
            >
              Od{renderSortIndicator("startDate")}
            </TableHead>
            <TableHead
              className="hidden md:table-cell cursor-pointer"
              onClick={() => requestSort("endDate")}
            >
              Do{renderSortIndicator("endDate")}
            </TableHead>
            <TableHead
              className="hidden md:table-cell text-right cursor-pointer"
              onClick={() => requestSort("creditCost")}
            >
              Koszt{renderSortIndicator("creditCost")}
            </TableHead>
            {showUserColumn && (
              <TableHead
                className="hidden xl:table-cell cursor-pointer"
                onClick={() => requestSort("username")}
              >
                Użytkownik{renderSortIndicator("username")}
              </TableHead>
            )}
            <TableHead className="hidden md:table-cell w-[70px]">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={`skeleton-${index}`} />)
          ) : sortedReservations.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <>
              {sortedReservations.map((item) => {
                const canModify = item.status === RESERVATION_STATUS.PENDING;
                const canReturn =
                  item.status === RESERVATION_STATUS.PENDING ||
                  item.status === RESERVATION_STATUS.RENTED;
                const showActions = mode === "admin" || scope === "my";

                const ActionMenu = () => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8"
                        data-testid="reservation-action-menu-trigger"
                      >
                        <MoreHorizontal className={ICON_SIZE_SM} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleViewDetails(item)}>
                        <Eye className={ICON_SIZE_SM + " mr-2"} />
                        Szczegóły
                      </DropdownMenuItem>

                      {showActions && (canModify || canReturn) && (
                        <>
                          <DropdownMenuSeparator />
                          {canModify && onModify && (
                            <DropdownMenuItem onClick={handleModify(item)}>
                              <Edit2 className={ICON_SIZE_SM + " mr-2"} />
                              Zmień daty
                            </DropdownMenuItem>
                          )}
                          {canReturn && onReturn && (
                            <DropdownMenuItem
                              onClick={handleReturn(item)}
                              className="text-blue-600 focus:text-blue-600 dark:text-blue-400 dark:focus:text-blue-400"
                              data-testid="return-reservation-button"
                            >
                              <CornerDownLeft className={ICON_SIZE_SM + " mr-2"} />
                              Zwróć
                            </DropdownMenuItem>
                          )}
                          {canModify && onCancel && (
                            <DropdownMenuItem
                              onClick={handleCancel(item)}
                              className="text-destructive focus:text-destructive"
                              data-testid="cancel-reservation-button"
                            >
                              <X className={ICON_SIZE_SM + " mr-2"} />
                              Anuluj
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={handleViewDetails(item)}
                    data-testid={`reservation-row-${item.id}`}
                  >
                    {/* Mobile Cells */}
                    {showUserColumn && (
                      <TableCell className="md:hidden truncate max-w-[100px] text-sm">
                        {item.username}
                      </TableCell>
                    )}
                    <TableCell className="md:hidden whitespace-nowrap text-sm">
                      {formatDateMobile(item.startDate)} - {formatDateMobile(item.endDate)}
                    </TableCell>
                    <TableCell className="md:hidden font-medium truncate max-w-[120px]">
                      {item.equipmentName}
                    </TableCell>
                    <TableCell className="md:hidden">
                      <StatusBadge
                        status={item.status}
                        className="whitespace-nowrap text-xs"
                        data-testid={`reservation-status-${item.id}`}
                      />
                    </TableCell>
                    <TableCell className="md:hidden text-right">
                      <ActionMenu />
                    </TableCell>

                    {/* Desktop Cells */}
                    <TableCell className="hidden md:table-cell">
                      <div
                        className="font-medium truncate max-w-[200px]"
                        title={item.equipmentName}
                      >
                        {item.equipmentName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
                      {item.equipmentType}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge
                        status={item.status}
                        className="whitespace-nowrap"
                        data-testid={`reservation-status-${item.id}`}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">
                      {formatDate(item.startDate)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">
                      {formatDate(item.endDate)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right font-medium">
                      {item.creditCost}
                    </TableCell>
                    {showUserColumn && (
                      <TableCell className="hidden xl:table-cell truncate max-w-[150px]">
                        {item.username}
                        {item.userId === currentUserId && " (Ty)"}
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell">
                      <ActionMenu />
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Intersection Observer Target for infinite scroll */}
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
