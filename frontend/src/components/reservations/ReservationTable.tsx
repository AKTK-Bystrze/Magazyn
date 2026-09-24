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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, X, CornerDownLeft, Eye, Edit2 } from "lucide-react";
import {
  ICON_SIZE_SM,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS,
} from "@/lib/config/constants";
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

/**
 * Returns badge variant based on reservation status
 */
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case RESERVATION_STATUS.PENDING:
      return "secondary"; // Orange/Yellow visually in theme
    case RESERVATION_STATUS.RENTED:
      return "default"; // Blue/Primary
    case RESERVATION_STATUS.RETURNED:
      return "outline"; // Green visually in theme
    case RESERVATION_STATUS.DENIED:
      return "destructive"; // Red
    default:
      return "outline";
  }
}

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

  const showUserColumn = mode === "admin" || scope === "all";

  // Mobile date formatter
  const formatDateMobile = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="rounded-md border overflow-x-auto bg-card w-full max-w-full mt-6">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Mobile Header */}
            {showUserColumn && <TableHead className="md:hidden">Użytkownik</TableHead>}
            <TableHead className="md:hidden">Daty</TableHead>
            <TableHead className="md:hidden">Sprzęt</TableHead>
            <TableHead className="md:hidden">Status</TableHead>
            <TableHead className="md:hidden w-[50px]"></TableHead>

            {/* Desktop Header */}
            <TableHead className="hidden md:table-cell">Sprzęt</TableHead>
            <TableHead className="hidden md:table-cell">Typ</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden md:table-cell">Od</TableHead>
            <TableHead className="hidden md:table-cell">Do</TableHead>
            <TableHead className="hidden md:table-cell text-right">Koszt</TableHead>
            {showUserColumn && <TableHead className="hidden xl:table-cell">Użytkownik</TableHead>}
            <TableHead className="hidden md:table-cell w-[70px]">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={`skeleton-${index}`} />)
          ) : reservations.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <>
              {reservations.map((item) => {
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
                            >
                              <CornerDownLeft className={ICON_SIZE_SM + " mr-2"} />
                              Zwróć
                            </DropdownMenuItem>
                          )}
                          {canModify && onCancel && (
                            <DropdownMenuItem
                              onClick={handleCancel(item)}
                              className="text-destructive focus:text-destructive"
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
                      <Badge
                        variant={getStatusVariant(item.status)}
                        className="whitespace-nowrap text-xs"
                      >
                        {RESERVATION_STATUS_LABELS[item.status] || item.status}
                      </Badge>
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
                      <Badge variant={getStatusVariant(item.status)} className="whitespace-nowrap">
                        {RESERVATION_STATUS_LABELS[item.status] || item.status}
                      </Badge>
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
