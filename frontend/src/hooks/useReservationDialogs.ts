import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users-api";
import { equipmentApi } from "@/lib/api/equipment-api";
import { useStore } from "@nanostores/react";
import { $creditBalance, initCreditBalance, refreshCreditBalance } from "@/lib/stores/credits";
import { getTodayAsString } from "@/lib/utils/date-utils";
import type { ReservationListItem, UpdateReservationCommand } from "@/types";

/**
 * Options for the useReservationDialogs hook.
 */
export interface UseReservationDialogsOptions {
  /** Current authenticated user ID */
  currentUserId?: string;
  /** Session credit balance for current user */
  sessionUserBalance?: number;
  /** Mutation function to update a single reservation */
  updateReservation: (id: string, command: UpdateReservationCommand) => Promise<unknown>;
  /** Mutation function to cancel a single reservation */
  cancelReservation: (id: string) => Promise<unknown>;
  /** Mutation function for bulk status updates */
  bulkUpdateStatus: (params: {
    reservationIds: string[];
    status: "CANCELLED" | "RETURNED";
  }) => Promise<{
    updated_count: number;
    refund_count?: number;
  }>;
  /** Setter for success feedback message */
  setSuccessMessage: (msg: string | null) => void;
  /** Setter for error feedback message */
  setErrorMessage: (msg: string | null) => void;
}

/**
 * Return type for the useReservationDialogs hook.
 */
export interface UseReservationDialogsReturn {
  cancelDialogOpen: boolean;
  setCancelDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  modifyDialogOpen: boolean;
  setModifyDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  returnDialogOpen: boolean;
  setReturnDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedReservation: ReservationListItem | null;
  batchReservations: ReservationListItem[];
  dialogReservation: ReservationListItem | null;
  currentUserBalance: number;
  handleModify: (reservation: ReservationListItem) => void;
  handleReturn: (reservation: ReservationListItem) => void;
  handleCancelClick: (reservation: ReservationListItem) => void;
  handleCancelAll: (reservations: ReservationListItem[]) => void;
  handleModifyDatesAll: (reservations: ReservationListItem[]) => void;
  handleReturnAll: (reservations: ReservationListItem[]) => void;
  handleCancelDialogClose: () => void;
  handleModifyDatesConfirm: (startDate: string, endDate: string) => Promise<void>;
  handleReturnConfirm: (command: UpdateReservationCommand) => Promise<void>;
  handleCancelConfirm: () => Promise<void>;
}

/**
 * Custom React hook for managing reservation dialogs (Cancel, Modify Dates, Return with Dates).
 * Encapsulates single & batch selection states, owner profile queries for credit calculations,
 * and bulk operations with Promise.allSettled error tolerance.
 */
export function useReservationDialogs({
  currentUserId,
  sessionUserBalance = 0,
  updateReservation,
  cancelReservation,
  bulkUpdateStatus,
  setSuccessMessage,
  setErrorMessage,
}: UseReservationDialogsOptions): UseReservationDialogsReturn {
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = React.useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false);
  const [selectedReservation, setSelectedReservation] = React.useState<ReservationListItem | null>(
    null
  );
  const [batchReservations, setBatchReservations] = React.useState<ReservationListItem[]>([]);

  const dialogReservation = selectedReservation || batchReservations[0] || null;
  const isOwner = dialogReservation?.userId === currentUserId;
  const needsOwnerProfile =
    !isOwner && !!dialogReservation && (modifyDialogOpen || returnDialogOpen);

  const { data: ownerProfile } = useQuery({
    queryKey: ["user", dialogReservation?.userId],
    queryFn: () => usersApi.getById(dialogReservation!.userId),
    enabled: needsOwnerProfile,
    staleTime: 0,
  });

  const storeBalance = useStore($creditBalance);

  React.useEffect(() => {
    initCreditBalance(sessionUserBalance);
  }, [sessionUserBalance]);

  const currentUserBalance = isOwner
    ? (storeBalance ?? sessionUserBalance)
    : (ownerProfile?.creditBalance ?? 0);

  const handleModify = React.useCallback((reservation: ReservationListItem) => {
    setSelectedReservation(reservation);
    setModifyDialogOpen(true);
  }, []);

  const handleReturn = React.useCallback((reservation: ReservationListItem) => {
    setSelectedReservation(reservation);
    setReturnDialogOpen(true);
  }, []);

  const handleCancelClick = React.useCallback((reservation: ReservationListItem) => {
    setSelectedReservation(reservation);
    setBatchReservations([]);
    setCancelDialogOpen(true);
  }, []);

  const handleCancelDialogClose = React.useCallback(() => {
    setCancelDialogOpen(false);
    setSelectedReservation(null);
    setBatchReservations([]);
  }, []);

  const handleCancelAll = React.useCallback((reservations: ReservationListItem[]) => {
    setBatchReservations(reservations);
    setSelectedReservation(null);
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

  const closeAndReset = React.useCallback((setOpen: (open: boolean) => void) => {
    setOpen(false);
    setSelectedReservation(null);
    setBatchReservations([]);
    refreshCreditBalance();
  }, []);

  const handleModifyDatesConfirm = React.useCallback(
    async (startDate: string, endDate: string) => {
      const targets =
        batchReservations.length > 0
          ? batchReservations
          : selectedReservation
            ? [selectedReservation]
            : [];
      if (targets.length === 0) return;

      const command = { startDate, endDate };

      if (targets.length === 1) {
        try {
          await updateReservation(targets[0].id, command);
          setSuccessMessage(
            `Daty rezerwacji dla "${targets[0].equipmentName}" zaktualizowane pomyślnie.`
          );
          closeAndReset(setModifyDialogOpen);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Nie udało się zaktualizować dat";
          setErrorMessage(message);
          throw err;
        }
      } else {
        const results = await Promise.allSettled(
          targets.map((target) => updateReservation(target.id, command))
        );
        const successful = results.filter((r) => r.status === "fulfilled").length;
        const failed = targets.length - successful;

        if (successful === 0) {
          const firstError = results.find((r) => r.status === "rejected") as
            PromiseRejectedResult | undefined;
          const detail =
            firstError?.reason instanceof Error ? firstError.reason.message : "Błąd aktualizacji";
          const message = `Nie udało się zaktualizować dat dla żadnej z ${targets.length} rezerwacji: ${detail}`;
          setErrorMessage(message);
          throw new Error(message);
        }

        setSuccessMessage(`${successful} rezerwacji zaktualizowano pomyślnie.`);
        if (failed > 0) {
          setErrorMessage(`${failed} rezerwacji nie udało się zaktualizować.`);
        }
        closeAndReset(setModifyDialogOpen);
      }
    },
    [
      selectedReservation,
      batchReservations,
      updateReservation,
      setSuccessMessage,
      setErrorMessage,
      closeAndReset,
    ]
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
        if (command.notes?.trim()) {
          const notes = command.notes.trim();
          await Promise.allSettled(
            targets.map((t) => equipmentApi.addMaintenanceLog(t.equipmentId, { notes }))
          );
        }

        if (targets.length === 1) {
          await updateReservation(targets[0].id, command);
          setSuccessMessage(`Sprzęt "${targets[0].equipmentName}" oznaczony jako zwrócony.`);
          closeAndReset(setReturnDialogOpen);
        } else {
          const hasDateChange = !!(command.startDate || command.endDate);

          if (hasDateChange) {
            const results = await Promise.allSettled(
              targets.map((target) => updateReservation(target.id, command))
            );
            const successful = results.filter((r) => r.status === "fulfilled").length;
            const failed = targets.length - successful;

            if (successful === 0) {
              const firstError = results.find((r) => r.status === "rejected") as
                PromiseRejectedResult | undefined;
              const detail =
                firstError?.reason instanceof Error
                  ? firstError.reason.message
                  : "Błąd aktualizacji";
              const message = `Nie udało się zwrócić żadnego z ${targets.length} elementów: ${detail}`;
              setErrorMessage(message);
              throw new Error(message);
            }

            setSuccessMessage(`${successful} elementów zaktualizowano i zwrócono.`);
            if (failed > 0) {
              setErrorMessage(`${failed} elementów nie udało się zaktualizować/zwrócić.`);
            }
            closeAndReset(setReturnDialogOpen);
          } else {
            const result = await bulkUpdateStatus({
              reservationIds: targets.map((t) => t.id),
              status: "RETURNED",
            });

            if (result.updated_count === 0) {
              const message = "Nie udało się oznaczyć żadnego elementu jako zwróconego.";
              setErrorMessage(message);
              throw new Error(message);
            }

            setSuccessMessage(`${result.updated_count} elementów oznaczono jako zwrócone.`);
            if (result.updated_count < targets.length) {
              setErrorMessage(
                `${targets.length - result.updated_count} elementów pominięto lub nie udało się zwrócić.`
              );
            }
            closeAndReset(setReturnDialogOpen);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się zwrócić sprzętu";
        setErrorMessage(message);
        throw err;
      }
    },
    [
      selectedReservation,
      batchReservations,
      updateReservation,
      bulkUpdateStatus,
      setSuccessMessage,
      setErrorMessage,
      closeAndReset,
    ]
  );

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
        closeAndReset(setCancelDialogOpen);
      } else {
        const result = await bulkUpdateStatus({
          reservationIds: targets.map((t) => t.id),
          status: "CANCELLED",
        });

        if (result.updated_count === 0) {
          const message = "Nie udało się anulować żadnej z wybranych rezerwacji.";
          setErrorMessage(message);
          throw new Error(message);
        }

        setSuccessMessage(
          `${result.updated_count} rezerwacji anulowano. ${result.refund_count} zwrotów godzinek przetworzono.`
        );
        if (result.updated_count < targets.length) {
          setErrorMessage(
            `${targets.length - result.updated_count} rezerwacji pominięto lub nie udało się anulować.`
          );
        }
        closeAndReset(setCancelDialogOpen);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się anulować rezerwacji";
      setErrorMessage(message);
      throw err;
    }
  }, [
    selectedReservation,
    batchReservations,
    cancelReservation,
    bulkUpdateStatus,
    setSuccessMessage,
    setErrorMessage,
    closeAndReset,
  ]);

  const handleRent = React.useCallback(
    async (reservation: ReservationListItem) => {
      try {
        const today = getTodayAsString();
        const hasDateChange = reservation.startDate?.split("T")[0] !== today;
        await updateReservation(reservation.id, { status: "RENTED" });
        const dateNotice = hasDateChange
          ? ` Uwaga: data rozpoczęcia została zmieniona na dzisiejszą (${today}).`
          : "";
        setSuccessMessage(
          `Sprzęt "${reservation.equipmentName}" oznaczony jako wypożyczony.${dateNotice}`
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Nie udało się zmienić statusu na wypożyczony";
        setErrorMessage(message);
      }
    },
    [updateReservation, setSuccessMessage, setErrorMessage]
  );

  const handleRentAll = React.useCallback(
    async (reservations: ReservationListItem[]) => {
      if (reservations.length === 0) return;
      try {
        const today = getTodayAsString();
        const anyDateChanged = reservations.some((r) => r.startDate?.split("T")[0] !== today);
        const results = await Promise.allSettled(
          reservations.map((r) => updateReservation(r.id, { status: "RENTED" }))
        );
        const successful = results.filter((r) => r.status === "fulfilled").length;
        const failed = reservations.length - successful;
        const dateNotice = anyDateChanged
          ? ` Uwaga: daty rozpoczęcia zostały zmienione na dzisiejszą (${today}).`
          : "";

        if (successful === reservations.length) {
          setSuccessMessage(`${successful} elementów oznaczono jako wypożyczone.${dateNotice}`);
        } else if (successful === 0) {
          setErrorMessage("Nie udało się wypożyczyć żadnego z wybranych sprzętów.");
        } else {
          setSuccessMessage(`${successful} elementów oznaczono jako wypożyczone.${dateNotice}`);
          setErrorMessage(`${failed} elementów nie udało się oznaczyć jako wypożyczone.`);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Nie udało się zmienić statusu na wypożyczony";
        setErrorMessage(message);
      }
    },
    [updateReservation, setSuccessMessage, setErrorMessage]
  );

  return {
    cancelDialogOpen,
    setCancelDialogOpen,
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
    handleRent,
    handleCancelClick,
    handleCancelAll,
    handleModifyDatesAll,
    handleReturnAll,
    handleRentAll,
    handleCancelDialogClose,
    handleModifyDatesConfirm,
    handleReturnConfirm,
    handleCancelConfirm,
  };
}
