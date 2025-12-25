import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api/equipment-api";
import type {
  EquipmentSearchItem,
  MaintenanceLog,
  CreateMaintenanceLogCommand,
  EquipmentReservationHistoryItem,
} from "@/types";
import { QUERY_STALE_TIME_MS } from "@/lib/config/constants";

/**
 * Query key factory for equipment details
 * Note: Maintenance logs are included in the details query (single API call)
 */
const QUERY_KEYS = {
  details: (id: string) => ["equipment", id, "details"] as const,
  reservations: (id: string) => ["equipment", id, "reservations"] as const,
};

/**
 * Return type for useEquipmentDetails hook
 */
interface UseEquipmentDetailsReturn {
  /** Equipment details */
  equipment: EquipmentSearchItem | undefined;
  /** Maintenance logs */
  maintenanceLogs: MaintenanceLog[];
  /** Reservation history */
  reservationHistory: EquipmentReservationHistoryItem[];
  /** Loading state for details */
  isLoading: boolean;
  /** Loading state for logs */
  isLogsLoading: boolean;
  /** Loading state for reservations */
  isReservationsLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Add maintenance log */
  addMaintenanceLog: (command: CreateMaintenanceLogCommand) => Promise<MaintenanceLog>;
  /** Mutation loading state */
  isMutating: boolean;
  /** Refetch all data */
  refetch: () => void;
}

/**
 * Hook for fetching equipment details including maintenance logs and reservation history
 *
 * @param equipmentId - ID of equipment to fetch, or null to disable
 * @returns Equipment details, maintenance logs, reservation history, and mutation handlers
 */
export function useEquipmentDetails(
  equipmentId: string | null
): UseEquipmentDetailsReturn {
  const queryClient = useQueryClient();

  // Fetch equipment details with maintenance logs (single API call)
  const {
    data: detailsData,
    isLoading,
    error,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: QUERY_KEYS.details(equipmentId ?? ""),
    queryFn: () => equipmentApi.getDetailsWithLogs(equipmentId!),
    enabled: !!equipmentId,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Fetch reservation history (separate endpoint)
  const {
    data: reservationHistoryData,
    isLoading: isReservationsLoading,
    refetch: refetchReservations,
  } = useQuery({
    queryKey: QUERY_KEYS.reservations(equipmentId ?? ""),
    queryFn: () => equipmentApi.getReservationHistory(equipmentId!),
    enabled: !!equipmentId,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Add maintenance log mutation
  const addMaintenanceLogMutation = useMutation({
    mutationFn: (command: CreateMaintenanceLogCommand) =>
      equipmentApi.addMaintenanceLog(equipmentId!, command),
    onSuccess: () => {
      // Invalidate details query (which now includes maintenance logs)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.details(equipmentId ?? ""),
      });
    },
  });

  // Add maintenance log handler
  const addMaintenanceLog = React.useCallback(
    async (command: CreateMaintenanceLogCommand) => {
      return addMaintenanceLogMutation.mutateAsync(command);
    },
    [addMaintenanceLogMutation]
  );

  // Refetch all
  const refetch = React.useCallback(() => {
    refetchDetails();
    refetchReservations();
  }, [refetchDetails, refetchReservations]);

  return {
    equipment: detailsData?.equipment,
    maintenanceLogs: detailsData?.maintenanceLogs ?? [],
    reservationHistory: reservationHistoryData ?? [],
    isLoading,
    isLogsLoading: isLoading, // Logs now load with details
    isReservationsLoading,
    error: error as Error | null,
    addMaintenanceLog,
    isMutating: addMaintenanceLogMutation.isPending,
    refetch,
  };
}
