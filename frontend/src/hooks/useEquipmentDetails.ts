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
 */
const QUERY_KEYS = {
  details: (id: string) => ["equipment", id, "details"] as const,
  maintenanceLogs: (id: string) => ["equipment", id, "maintenance-logs"] as const,
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

  // Fetch equipment details
  const {
    data: equipment,
    isLoading,
    error,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: QUERY_KEYS.details(equipmentId ?? ""),
    queryFn: () => equipmentApi.getDetails(equipmentId!),
    enabled: !!equipmentId,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Fetch maintenance logs
  const {
    data: maintenanceLogsData,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: QUERY_KEYS.maintenanceLogs(equipmentId ?? ""),
    queryFn: () => equipmentApi.getMaintenanceLogs(equipmentId!),
    enabled: !!equipmentId,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Fetch reservation history
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
      // Invalidate logs and details to refetch
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.maintenanceLogs(equipmentId ?? ""),
      });
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
    refetchLogs();
    refetchReservations();
  }, [refetchDetails, refetchLogs, refetchReservations]);

  return {
    equipment,
    maintenanceLogs: maintenanceLogsData ?? [],
    reservationHistory: reservationHistoryData ?? [],
    isLoading,
    isLogsLoading,
    isReservationsLoading,
    error: error as Error | null,
    addMaintenanceLog,
    isMutating: addMaintenanceLogMutation.isPending,
    refetch,
  };
}
