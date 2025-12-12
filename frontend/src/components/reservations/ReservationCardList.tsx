import * as React from "react";
import { ReservationCard } from "./ReservationCard";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package } from "lucide-react";
import { ICON_SIZE_LG } from "@/lib/config/constants";
import type { ReservationListItem } from "@/types";

interface ReservationCardListProps {
  reservations: ReservationListItem[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  hasFilters?: boolean;
  onPageChange: (page: number) => void;
  onModify?: (reservation: ReservationListItem) => void;
  onCancel?: (reservation: ReservationListItem) => void;
  onViewDetails?: (reservation: ReservationListItem) => void;
}

/**
 * Displays a list of reservation cards with pagination
 * Handles loading and empty states
 *
 * @param reservations - Array of reservations to display
 * @param isLoading - Loading state
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param hasFilters - Whether filters are applied (affects empty state message)
 * @param onPageChange - Callback when page changes
 * @param onModify - Callback for modify action
 * @param onCancel - Callback for cancel action
 * @param onViewDetails - Callback for view details action
 */
export function ReservationCardList({
  reservations,
  isLoading,
  currentPage,
  totalPages,
  hasFilters = false,
  onPageChange,
  onModify,
  onCancel,
  onViewDetails,
}: ReservationCardListProps) {
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
        {reservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onModify={onModify}
            onCancel={onCancel}
            onViewDetails={onViewDetails}
          />
        ))}
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
