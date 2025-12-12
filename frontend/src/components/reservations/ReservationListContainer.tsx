import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useReservations } from "@/hooks/useReservations";
import { ReservationCardList } from "./ReservationCardList";
import { ReservationFilters } from "./ReservationFilters";
import { CancelReservationDialog } from "./CancelReservationDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  ICON_SIZE_SM,
  MESSAGE_AUTO_DISMISS_MS,
  DEFAULT_STATUS_FILTER,
  DEFAULT_SORT_OPTION,
} from "@/lib/config/constants";
import type { ReservationListItem, ReservationListProps } from "@/types";



/**
 * Inner component that uses the useReservations hook
 * Wrapped by QueryProvider in the exported component
 */
function ReservationListContainerInner({
  mode,
  initialFilters,
}: ReservationListProps) {
  const {
    data,
    isLoading,
    error,
    filters,
    setFilter,
    resetFilters,
    cancelReservation,
    isMutating,
  } = useReservations({ initialFilters });

  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [selectedReservation, setSelectedReservation] =
    React.useState<ReservationListItem | null>(null);

  // Feedback states
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Clear messages after timeout
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), MESSAGE_AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  React.useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), MESSAGE_AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Handle modify action - TODO: Implement ModifyReservationDialog
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleModify = React.useCallback((_reservation: ReservationListItem) => {
    // Will be implemented in Phase 5
    setErrorMessage("Modify functionality coming soon!");
  }, []);

  // Handle cancel action
  const handleCancelClick = React.useCallback(
    (reservation: ReservationListItem) => {
      setSelectedReservation(reservation);
      setCancelDialogOpen(true);
    },
    []
  );

  // Confirm cancel
  const handleCancelConfirm = React.useCallback(async () => {
    if (!selectedReservation) return;

    try {
      await cancelReservation(selectedReservation.id);
      setSuccessMessage(
        `Reservation for "${selectedReservation.equipmentName}" has been cancelled. Credits have been refunded.`
      );
      setCancelDialogOpen(false);
      setSelectedReservation(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel reservation";
      setErrorMessage(message);
    }
  }, [selectedReservation, cancelReservation]);

  // Handle cancel dialog close
  const handleCancelDialogClose = React.useCallback(() => {
    setCancelDialogOpen(false);
    setSelectedReservation(null);
  }, []);

  // Handle bulk cancel
  const handleCancelAll = React.useCallback(
    async (reservations: ReservationListItem[]) => {
      // Cancel all reservations in parallel for better performance
      const results = await Promise.allSettled(
        reservations.map((reservation) => cancelReservation(reservation.id))
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed === 0) {
        setSuccessMessage(
          `${successful} ${successful === 1 ? "reservation has" : "reservations have"} been cancelled. Credits have been refunded.`
        );
      } else if (successful === 0) {
        setErrorMessage(
          `Failed to cancel all ${reservations.length} reservations. Please try again.`
        );
      } else {
        setSuccessMessage(
          `${successful} reservations cancelled successfully. ${failed} failed - please try again for those.`
        );
      }
    },
    [cancelReservation]
  );

  // Handle bulk modify dates
  const handleModifyDatesAll = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_reservations: ReservationListItem[]) => {
      // TODO: Implement bulk modify dates dialog
      setErrorMessage("Bulk modify dates functionality coming soon!");
    },
    []
  );

  // Handle view details - TODO: Navigate to detail page
  const handleViewDetails = React.useCallback(
    (reservation: ReservationListItem) => {
      // Navigate to details page
      window.location.href = `/reservations/${reservation.id}`;
    },
    []
  );

  // Handle page change
  const handlePageChange = React.useCallback(
    (page: number) => {
      setFilter("page", page);
    },
    [setFilter]
  );

  // Determine if filters are active (for empty state messaging)
  const hasActiveFilters =
    filters.status !== DEFAULT_STATUS_FILTER ||
    filters.sort !== DEFAULT_SORT_OPTION;

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className={ICON_SIZE_SM + " text-green-600"} />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {(error || errorMessage) && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className={ICON_SIZE_SM} />
          <AlertDescription>
            {errorMessage || error?.message || "An error occurred"}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <ReservationFilters
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      {/* Reservation List */}
      <ReservationCardList
        reservations={data?.reservations ?? []}
        isLoading={isLoading}
        currentPage={filters.page}
        totalPages={data?.pagination.totalPages ?? 0}
        hasFilters={hasActiveFilters}
        mode={mode}
        onPageChange={handlePageChange}
        onModify={mode === "user" ? handleModify : undefined}
        onCancel={mode === "user" ? handleCancelClick : undefined}
        onCancelAll={mode === "user" ? handleCancelAll : undefined}
        onModifyDatesAll={mode === "user" ? handleModifyDatesAll : undefined}
        onViewDetails={handleViewDetails}
      />

      {/* Cancel Dialog */}
      <CancelReservationDialog
        isOpen={cancelDialogOpen}
        reservation={selectedReservation}
        isSubmitting={isMutating}
        onConfirm={handleCancelConfirm}
        onClose={handleCancelDialogClose}
      />
    </div>
  );
}

/**
 * Main reservation list container with QueryProvider wrapper
 * Handles data fetching, filtering, pagination, and actions
 *
 * @param mode - 'user' for user view, 'admin' for admin view
 * @param initialFilters - Optional initial filter values
 */
export function ReservationListContainer(props: ReservationListProps) {
  return (
    <QueryProvider>
      <ReservationListContainerInner {...props} />
    </QueryProvider>
  );
}
