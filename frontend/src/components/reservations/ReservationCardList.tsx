import * as React from "react";
import { ReservationCard } from "./ReservationCard";
import { GroupedReservationCard } from "./GroupedReservationCard";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package } from "lucide-react";
import { ICON_SIZE_LG } from "@/lib/config/constants";
import { groupReservationsByDateRange } from "@/lib/utils/group-reservations";
import type { ReservationListItem } from "@/types";

interface ReservationCardListProps {
  reservations: ReservationListItem[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  hasFilters?: boolean;
  mode: "user" | "admin";
  onPageChange: (page: number) => void;
  onModify?: (reservation: ReservationListItem) => void;
  onCancel?: (reservation: ReservationListItem) => void;
  onCancelAll?: (reservations: ReservationListItem[]) => void;
  onModifyDatesAll?: (reservations: ReservationListItem[]) => void;
  onViewDetails?: (reservation: ReservationListItem) => void;
}

/**
 * Displays a list of reservation cards with pagination and grouping support
 * Groups reservations with same dates by same user into expandable cards
 * Handles loading and empty states
 */
export function ReservationCardList({
  reservations,
  isLoading,
  currentPage,
  totalPages,
  hasFilters = false,
  mode,
  onPageChange,
  onModify,
  onCancel,
  onCancelAll,
  onModifyDatesAll,
  onViewDetails,
}: ReservationCardListProps) {
  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set()
  );

  // Group reservations by date range
  const groups = React.useMemo(
    () => groupReservationsByDateRange(reservations),
    [reservations]
  );

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (reservations.length === 0) {
    return (
      <EmptyState hasFilters={hasFilters} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Reservation Cards */}
      <div className="grid gap-4">
        {groups.map((group) => {
          // Single-item groups render as regular cards
          if (group.items.length === 1) {
            return (
              <ReservationCard
                key={group.items[0].id}
                reservation={group.items[0]}
                onModify={onModify}
                onCancel={onCancel}
                onViewDetails={onViewDetails}
                mode={mode}
              />
            );
          }

          // Multi-item groups render as expandable grouped cards
          return (
            <GroupedReservationCard
              key={group.groupKey}
              group={group}
              isExpanded={expandedGroups.has(group.groupKey)}
              onToggle={() => toggleGroup(group.groupKey)}
              onCancelAll={() => onCancelAll?.(group.items)}
              onModifyDatesAll={() => onModifyDatesAll?.(group.items)}
              onCancelSingle={(item) => onCancel?.(item)}
              onModifySingle={(item) => onModify?.(item)}
              mode={mode}
            />
          );
        })}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

/**
 * Skeleton loading state for a single card
 */
function SkeletonCard() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
}

/**
 * Empty state component with context-aware messaging
 */
function EmptyState({ hasFilters }: EmptyStateProps) {
  const Icon = hasFilters ? Package : Calendar;
  const title = hasFilters
    ? "No reservations match your filters"
    : "No reservations yet";
  const description = hasFilters
    ? "Try adjusting your filters or clearing them to see all reservations."
    : "When you reserve equipment, it will appear here.";

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className={ICON_SIZE_LG + " text-muted-foreground"} />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
