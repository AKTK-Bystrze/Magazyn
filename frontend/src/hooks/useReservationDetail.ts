import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationsApi } from "@/lib/api/reservations-api";
import type {
  ReservationDetail,
  UpdateReservationCommand,
  UpdateReservationResponse,
} from "@/types";
import { QUERY_STALE_TIME_MS } from "@/lib/config/constants";

/**
 * Query key factory for reservation details
 */
const QUERY_KEYS = {
  detail: (id: string) => ["reservations", "detail", id] as const,
};

interface UseReservationDetailReturn {
  /** Reservation detail data with audit trail */
  reservation: ReservationDetail | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch reservation data */
  refetch: () => void;
  /** Update reservation status */
  updateStatus: (
    command: UpdateReservationCommand
  ) => Promise<UpdateReservationResponse>;
  /** Whether mutation is in progress */
  isUpdating: boolean;
}

/**
 * Hook for managing single reservation details with status update mutations
 * Fetches reservation with audit trail and provides status change capability
 *
 * @param reservationId - ID of reservation to fetch
 * @returns Reservation data and update controls
 */
export function useReservationDetail(
  reservationId: string
): UseReservationDetailReturn {
  const queryClient = useQueryClient();

  // Fetch reservation details
  const {
    data: reservation,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.detail(reservationId),
    queryFn: () => reservationsApi.getById(reservationId),
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Status update mutation
  const updateMutation = useMutation({
    mutationFn: (command: UpdateReservationCommand) =>
      reservationsApi.update(reservationId, command),
    onSuccess: () => {
      // Invalidate detail query to refetch
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.detail(reservationId),
      });
      // Invalidate list queries to update reservation list
      queryClient.invalidateQueries({ queryKey: ["reservations", "list"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  // Update status helper
  const updateStatus = React.useCallback(
    async (command: UpdateReservationCommand) => {
      return updateMutation.mutateAsync(command);
    },
    [updateMutation]
  );

  return {
    reservation,
    isLoading,
    error: error as Error | null,
    refetch,
    updateStatus,
    isUpdating: updateMutation.isPending,
  };
}
