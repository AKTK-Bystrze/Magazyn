import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useReservations } from "@/hooks/useReservations";
import { ReservationCardList } from "./ReservationCardList";
import { ReservationTable } from "./ReservationTable";
import { ReservationFilters } from "./ReservationFilters";
import { ReservationViewTabs, type ReservationScope } from "./ReservationViewTabs";
import { CancelReservationDialog } from "./CancelReservationDialog";
import { ModifyDatesDialog } from "./ModifyDatesDialog";
import { ReturnWithDatesDialog } from "./ReturnWithDatesDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, LayoutGrid, List } from "lucide-react";
import {
  ICON_SIZE_SM,
  MESSAGE_AUTO_DISMISS_MS,
  DEFAULT_STATUS_FILTER,
  DEFAULT_SORT_OPTION,
} from "@/lib/config/constants";
import type { ReservationListItem, ReservationListProps, UpdateReservationCommand } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users-api";

/**
 * Inner component that uses the useReservations hook
 * Wrapped by QueryProvider in the exported component
 */
function ReservationListContainerInner({
  mode,
  currentUserId,
  currentUserBalance: sessionUserBalance = 0,
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
    bulkUpdateStatus,
    isMutating,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReservations({ initialFilters });

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = React.useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false);
  const [selectedReservation, setSelectedReservation] = React.useState<ReservationListItem | null>(
    null
  );
  const [batchReservations, setBatchReservations] = React.useState<ReservationListItem[]>([]);

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

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

  const dialogReservation = selectedReservation || batchReservations[0];
  const isOwner = dialogReservation?.userId === currentUserId;
  const needsOwnerProfile =
    !isOwner && !!dialogReservation && (modifyDialogOpen || returnDialogOpen);

  const { data: ownerProfile } = useQuery({
    queryKey: ["user", dialogReservation?.userId],
    queryFn: () => usersApi.getById(dialogReservation!.userId),
    enabled: needsOwnerProfile,
    staleTime: 0,
  });

  const currentUserBalance = isOwner ? sessionUserBalance : (ownerProfile?.creditBalance ?? 0);

  const handleModify = React.useCallback((reservation: ReservationListItem) => {
    setSelectedReservation(reservation);
    setModifyDialogOpen(true);
  }, []);

  const handleReturn = React.useCallback((reservation: ReservationListItem) => {
    setSelectedReservation(reservation);
    setReturnDialogOpen(true);
  }, []);

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
            `Daty rezerwacji dla "${targets[0].equipmentName}" zaktualizowane pomyślnie.`
          );
        } else {
          const results = await Promise.allSettled(
            targets.map((target) => updateReservation(target.id, command))
          );
          const successful = results.filter((r) => r.status === "fulfilled").length;

          if (successful === targets.length) {
            setSuccessMessage(`${successful} rezerwacji zaktualizowano pomyślnie.`);
          } else {
            setSuccessMessage(
              `${successful} zaktualizowano. ${targets.length - successful} nie powiodło się.`
            );
          }
        }

        setModifyDialogOpen(false);
        setSelectedReservation(null);
        setBatchReservations([]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się zaktualizować dat";
        setErrorMessage(message);
      }
    },
    [selectedReservation, batchReservations, updateReservation]
  );

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
          setSuccessMessage(`Sprzęt "${targets[0].equipmentName}" oznaczony jako zwrócony.`);
        } else {
          const hasDateChange = !!(command.startDate || command.endDate);

          if (hasDateChange) {
            const results = await Promise.allSettled(
              targets.map((target) => updateReservation(target.id, command))
            );
            const successful = results.filter((r) => r.status === "fulfilled").length;

            setSuccessMessage(
              `${successful} elementów zaktualizowano i zwrócono. ${targets.length - successful} nie powiodło się.`
            );
          } else {
            const result = await bulkUpdateStatus({
              reservationIds: targets.map((t) => t.id),
              status: "RETURNED",
            });

            setSuccessMessage(`${result.updated_count} elementów oznaczono jako zwrócone.`);
          }
        }

        setReturnDialogOpen(false);
        setSelectedReservation(null);
        setBatchReservations([]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się zwrócić sprzętu";
        setErrorMessage(message);
      }
    },
    [selectedReservation, batchReservations, updateReservation, bulkUpdateStatus]
  );

  const handleCancelClick = React.useCallback((reservation: ReservationListItem) => {
    setSelectedReservation(reservation);
    setBatchReservations([]); // Clear batch
    setCancelDialogOpen(true);
  }, []);

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
        await cancelReservation(targets[0].id);
        setSuccessMessage(
          `Rezerwacja "${targets[0].equipmentName}" została anulowana. Godzinki zostały zwrócone.`
        );
      } else {
        const result = await bulkUpdateStatus({
          reservationIds: targets.map((t) => t.id),
          status: "DENIED",
        });

        setSuccessMessage(
          `${result.updated_count} rezerwacji anulowano. ${result.refund_count} zwrotów godzinek przetworzono.`
        );
      }

      setCancelDialogOpen(false);
      setSelectedReservation(null);
      setBatchReservations([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się anulować rezerwacji";
      setErrorMessage(message);
    }
  }, [selectedReservation, batchReservations, cancelReservation, bulkUpdateStatus]);

  const handleCancelDialogClose = React.useCallback(() => {
    setCancelDialogOpen(false);
    setSelectedReservation(null);
    setBatchReservations([]);
  }, []);

  const handleCancelAll = React.useCallback((reservations: ReservationListItem[]) => {
    setBatchReservations(reservations);
    setSelectedReservation(null); // Clear single
    setCancelDialogOpen(true);
  }, []);

  const handleModifyDatesAll = React.useCallback((reservations: ReservationListItem[]) => {
    setBatchReservations(reservations);
    setSelectedReservation(null);
    setModifyDialogOpen(true);
  }, []);

  const handleReturnAll = React.useCallback((reservations: ReservationListItem[]) => {
    setBatchReservations(reservations);
    setSelectedReservation(null);
    setReturnDialogOpen(true);
  }, []);

  const handleViewDetails = React.useCallback((reservation: ReservationListItem) => {
    window.location.href = `/reservations/${reservation.id}`;
  }, []);

  const handleScopeChange = React.useCallback(
    (scope: ReservationScope) => {
      setFilter("scope", scope);
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

  const hasActiveFilters =
    filters.status !== DEFAULT_STATUS_FILTER || filters.sort !== DEFAULT_SORT_OPTION;

  const showActions = mode === "admin" || filters.scope === "my";

  return (
    <div className="space-y-6" data-testid="reservation-list-container">
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
          <AlertDescription>{errorMessage || error?.message || "Wystąpił błąd"}</AlertDescription>
        </Alert>
      )}

      {/* View Tabs and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ReservationViewTabs activeScope={filters.scope} onScopeChange={handleScopeChange} />
        <div className="flex items-center gap-1 bg-muted p-1 rounded-md self-start sm:self-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="px-2 h-8"
            onClick={() => setViewMode("grid")}
            aria-label="Widok kafelków"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="px-2 h-8"
            onClick={() => setViewMode("list")}
            aria-label="Widok tabeli"
            data-testid="view-mode-table"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ReservationFilters filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {/* Reservation List or Table */}
      {viewMode === "grid" ? (
        <ReservationCardList
          reservations={data?.reservations ?? []}
          isLoading={isLoading}
          hasFilters={hasActiveFilters}
          mode={mode}
          scope={filters.scope}
          currentUserId={currentUserId}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onModify={showActions ? handleModify : undefined}
          onCancel={showActions ? handleCancelClick : undefined}
          onReturn={showActions ? handleReturn : undefined}
          onCancelAll={showActions ? handleCancelAll : undefined}
          onModifyDatesAll={showActions ? handleModifyDatesAll : undefined}
          onReturnAll={showActions ? handleReturnAll : undefined}
          onViewDetails={handleViewDetails}
        />
      ) : (
        <ReservationTable
          reservations={data?.reservations ?? []}
          isLoading={isLoading}
          hasFilters={hasActiveFilters}
          mode={mode}
          scope={filters.scope}
          currentUserId={currentUserId}
          onModify={showActions ? handleModify : undefined}
          onCancel={showActions ? handleCancelClick : undefined}
          onReturn={showActions ? handleReturn : undefined}
          onViewDetails={handleViewDetails}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}

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
