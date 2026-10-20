import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useReservations } from "@/hooks/useReservations";
import { useReservationDialogs } from "@/hooks/useReservationDialogs";
import { useDismissibleMessage } from "@/lib/hooks/useDismissibleMessage";
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
import { ICON_SIZE_SM, hasActiveReservationFilters } from "@/lib/config/constants";
import type { ReservationListItem, ReservationListProps } from "@/types";

/**
 * Inner component that uses the useReservations and useReservationDialogs hooks.
 * Wrapped by QueryProvider in the exported component.
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

  const [successMessage, setSuccessMessage] = useDismissibleMessage();
  const [errorMessage, setErrorMessage] = useDismissibleMessage();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  const {
    cancelDialogOpen,
    modifyDialogOpen,
    setModifyDialogOpen,
    returnDialogOpen,
    setReturnDialogOpen,
    selectedReservation,
    batchReservations,
    dialogReservation,
    currentUserBalance,
    handleModify,
    handleReturn,
    handleCancelClick,
    handleCancelAll,
    handleModifyDatesAll,
    handleReturnAll,
    handleCancelDialogClose,
    handleModifyDatesConfirm,
    handleReturnConfirm,
    handleCancelConfirm,
  } = useReservationDialogs({
    currentUserId,
    sessionUserBalance,
    updateReservation,
    cancelReservation,
    bulkUpdateStatus,
    setSuccessMessage,
    setErrorMessage,
  });

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

  const hasActiveFilters = hasActiveReservationFilters(filters);
  const showActions = mode === "admin" || filters.scope === "my";

  return (
    <div className="space-y-6" data-testid="reservation-list-container">
      {successMessage && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className={ICON_SIZE_SM + " text-green-600"} />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {(error || errorMessage) && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className={ICON_SIZE_SM} />
          <AlertDescription>{errorMessage || error?.message || "Wystąpił błąd"}</AlertDescription>
        </Alert>
      )}

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

      <ReservationFilters filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {viewMode === "grid" ? (
        <ReservationCardList
          reservations={data?.reservations ?? []}
          isLoading={isLoading}
          hasFilters={hasActiveFilters}
          mode={mode}
          scope={filters.scope}
          currentUserId={currentUserId}
          sort={filters.sort}
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

      <CancelReservationDialog
        isOpen={cancelDialogOpen}
        reservation={selectedReservation}
        reservations={batchReservations}
        isSubmitting={isMutating}
        onConfirm={handleCancelConfirm}
        onClose={handleCancelDialogClose}
      />

      {dialogReservation && (
        <ModifyDatesDialog
          open={modifyDialogOpen}
          onOpenChange={setModifyDialogOpen}
          reservation={dialogReservation}
          reservations={batchReservations}
          onConfirm={async ({ startDate, endDate }) => {
            await handleModifyDatesConfirm(startDate, endDate);
          }}
          isSubmitting={isMutating}
          currentUserBalance={currentUserBalance}
          allowNegativeBalance={mode === "admin"}
        />
      )}

      {dialogReservation && (
        <ReturnWithDatesDialog
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
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
 * Main reservation list container with QueryProvider wrapper.
 * Handles data fetching, filtering, pagination, and actions.
 */
export function ReservationListContainer(props: ReservationListProps) {
  return (
    <QueryProvider>
      <ReservationListContainerInner {...props} />
    </QueryProvider>
  );
}
