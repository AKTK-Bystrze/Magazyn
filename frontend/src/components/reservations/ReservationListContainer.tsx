import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useReservations } from "@/hooks/useReservations";
import { ReservationCardList } from "./ReservationCardList";
import { ReservationFilters } from "./ReservationFilters";
import { ReservationViewTabs, type ReservationScope } from "./ReservationViewTabs";
import { CancelReservationDialog } from "./CancelReservationDialog";
import { ModifyDatesDialog } from "./ModifyDatesDialog";
import { ReturnWithDatesDialog } from "./ReturnWithDatesDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  ICON_SIZE_SM,
  MESSAGE_AUTO_DISMISS_MS,
  DEFAULT_STATUS_FILTER,
  DEFAULT_SORT_OPTION,
} from "@/lib/config/constants";
import type { ReservationListItem, ReservationListProps, UpdateReservationCommand } from "@/types";

/**
 * Inner component that uses the useReservations hook
 * Wrapped by QueryProvider in the exported component
 */
function ReservationListContainerInner({
  mode,
  currentUserId,
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
    updateReservation,
    isMutating,
  } = useReservations({ initialFilters });

  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = React.useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false);
  const [selectedReservation, setSelectedReservation] =
    React.useState<ReservationListItem | null>(null);
  const [batchReservations, setBatchReservations] = React.useState<
    ReservationListItem[]
  >([]);

  // Feedback states
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    null
  );

  // Clear messages after timeout
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(
        () => setSuccessMessage(null),
        MESSAGE_AUTO_DISMISS_MS
      );
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  React.useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(
        () => setErrorMessage(null),
        MESSAGE_AUTO_DISMISS_MS
      );
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Credit balance validation is handled by backend
  // We don't fetch it here to avoid permission issues for regular users
  const currentUserBalance = 0;

  // Handle modify action
  const handleModify = React.useCallback(
    (reservation: ReservationListItem) => {
      setSelectedReservation(reservation);
      setModifyDialogOpen(true);
    },
    []
  );

  // Handle return action
  const handleReturn = React.useCallback(
    (reservation: ReservationListItem) => {
      setSelectedReservation(reservation);
      setReturnDialogOpen(true);
    },
    []
  );

  // Handle modify dates confirm
  const handleModifyDatesConfirm = React.useCallback(
    async (start: Date, end: Date) => {
      const targets =
        batchReservations.length > 0
          ? batchReservations
          : selectedReservation
            ? [selectedReservation]
            : [];
      if (targets.length === 0) return;

      try {
        const command = {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        };

        if (targets.length === 1) {
          await updateReservation(targets[0].id, command);
          setSuccessMessage(
            `Reservation dates for "${targets[0].equipmentName}" updated successfully.`
          );
        } else {
          // Bulk update
          const results = await Promise.allSettled(
            targets.map((target) => updateReservation(target.id, command))
          );
          const successful = results.filter(
            (r) => r.status === "fulfilled"
          ).length;

          if (successful === targets.length) {
            setSuccessMessage(`${successful} reservations updated successfully.`);
          } else {
            setSuccessMessage(
              `${successful} updated. ${targets.length - successful} failed.`
            );
          }
        }

        setModifyDialogOpen(false);
        setSelectedReservation(null);
        setBatchReservations([]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update dates";
        setErrorMessage(message);
      }
    },
    [selectedReservation, batchReservations, updateReservation]
  );

  // Handle return confirm
  const handleReturnConfirm = React.useCallback(
    async (command: UpdateReservationCommand) => {
      const targets =
        batchReservations.length > 0
          ? batchReservations
          : selectedReservation
            ? [selectedReservation]
            : [];
      if (targets.length === 0) return;

      try {
        if (targets.length === 1) {
          await updateReservation(targets[0].id, command);
          setSuccessMessage(
            `Equipment "${targets[0].equipmentName}" marked as returned.`
          );
        } else {
          // Bulk return
          const results = await Promise.allSettled(
            targets.map((target) => updateReservation(target.id, command))
          );
          const successful = results.filter(
            (r) => r.status === "fulfilled"
          ).length;

          if (successful === targets.length) {
            setSuccessMessage(`${successful} items marked as returned.`);
          } else {
            setSuccessMessage(
              `${successful} returned. ${targets.length - successful} failed.`
            );
          }
        }

        setReturnDialogOpen(false);
        setSelectedReservation(null);
        setBatchReservations([]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to return equipment";
        setErrorMessage(message);
      }
    },
    [selectedReservation, batchReservations, updateReservation]
  );

  // Handle cancel action
  const handleCancelClick = React.useCallback(
    (reservation: ReservationListItem) => {
      setSelectedReservation(reservation);
      setBatchReservations([]); // Clear batch
      setCancelDialogOpen(true);
    },
    []
  );

  // Confirm cancel
  const handleCancelConfirm = React.useCallback(async () => {
    const targets =
      batchReservations.length > 0
        ? batchReservations
        : selectedReservation
          ? [selectedReservation]
          : [];

    if (targets.length === 0) return;

    try {
      if (targets.length === 1) {
        // Single cancel
        await cancelReservation(targets[0].id);
        setSuccessMessage(
          `Reservation for "${targets[0].equipmentName}" has been cancelled. Credits have been refunded.`
        );
      } else {
        // Bulk cancel
        const results = await Promise.allSettled(
          targets.map((reservation) => cancelReservation(reservation.id))
        );

        const successful = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failed = results.filter((r) => r.status === "rejected").length;

        if (failed === 0) {
          setSuccessMessage(
            `${successful} reservations have been cancelled. Credits have been refunded.`
          );
        } else if (successful === 0) {
          setErrorMessage(
            `Failed to cancel all ${targets.length} reservations. Please try again.`
          );
        } else {
          setSuccessMessage(
            `${successful} reservations cancelled successfully. ${failed} failed - please try again for those.`
          );
        }
      }

      setCancelDialogOpen(false);
      setSelectedReservation(null);
      setBatchReservations([]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel reservation";
      setErrorMessage(message);
    }
  }, [selectedReservation, batchReservations, cancelReservation]);

  // Handle cancel dialog close
  const handleCancelDialogClose = React.useCallback(() => {
    setCancelDialogOpen(false);
    setSelectedReservation(null);
    setBatchReservations([]);
  }, []);

  // Handle bulk cancel
  const handleCancelAll = React.useCallback(
    (reservations: ReservationListItem[]) => {
      setBatchReservations(reservations);
      setSelectedReservation(null); // Clear single
      setCancelDialogOpen(true);
    },
    []
  );

  // Handle bulk modify dates
  const handleModifyDatesAll = React.useCallback(
    (reservations: ReservationListItem[]) => {
      setBatchReservations(reservations);
      setSelectedReservation(null);
      setModifyDialogOpen(true);
    },
    []
  );

  // Handle bulk return
  const handleReturnAll = React.useCallback(
    (reservations: ReservationListItem[]) => {
      setBatchReservations(reservations);
      setSelectedReservation(null);
      setReturnDialogOpen(true);
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

  // Handle scope change with URL update
  const handleScopeChange = React.useCallback(
    (scope: ReservationScope) => {
      setFilter("scope", scope);
      // Update URL query param for shareable links
      const url = new URL(window.location.href);
      if (scope === "my") {
        url.searchParams.delete("scope");
      } else {
        url.searchParams.set("scope", scope);
      }
      window.history.replaceState({}, "", url.toString());
    },
    [setFilter]
  );

  // Determine if filters are active (for empty state messaging)
  const hasActiveFilters =
    filters.status !== DEFAULT_STATUS_FILTER ||
    filters.sort !== DEFAULT_SORT_OPTION;

  // Regular users: actions only in "My Reservations"
  // Admins: actions in both "My Reservations" and "All Reservations"
  const showActions = mode === "admin" || filters.scope === "my";

  const dialogReservation = selectedReservation || batchReservations[0];

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

      {/* View Tabs */}
      <ReservationViewTabs
        activeScope={filters.scope}
        onScopeChange={handleScopeChange}
      />

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
        scope={filters.scope}
        currentUserId={currentUserId}
        onPageChange={handlePageChange}
        onModify={showActions ? handleModify : undefined}
        onCancel={showActions ? handleCancelClick : undefined}
        onReturn={showActions ? handleReturn : undefined}
        onCancelAll={showActions ? handleCancelAll : undefined}
        onModifyDatesAll={showActions ? handleModifyDatesAll : undefined}
        onReturnAll={showActions ? handleReturnAll : undefined}
        onViewDetails={handleViewDetails}
      />

      {/* Cancel Dialog */}
      <CancelReservationDialog
        isOpen={cancelDialogOpen}
        reservation={selectedReservation}
        reservations={batchReservations}
        isSubmitting={isMutating}
        onConfirm={handleCancelConfirm}
        onClose={handleCancelDialogClose}
      />

      {/* Modify Dates Dialog */}
      {dialogReservation && (
        <ModifyDatesDialog
          open={modifyDialogOpen}
          onOpenChange={(open) => {
            if (!open) setModifyDialogOpen(false);
          }}
          reservation={dialogReservation}
          reservations={batchReservations}
          onConfirm={async ({ startDate, endDate }) => {
            await handleModifyDatesConfirm(new Date(startDate), new Date(endDate));
          }}
          isSubmitting={isMutating}
          currentUserBalance={currentUserBalance}
        />
      )}

      {/* Return With Dates Dialog */}
      {dialogReservation && (
        <ReturnWithDatesDialog
          open={returnDialogOpen}
          onOpenChange={(open) => {
            if (!open) setReturnDialogOpen(false);
          }}
          reservation={dialogReservation}
          reservations={batchReservations}
          onConfirm={handleReturnConfirm}
          isSubmitting={isMutating}
          currentUserBalance={currentUserBalance}
        />
      )}
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
