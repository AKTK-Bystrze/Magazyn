import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MaintenanceLogSection } from "./MaintenanceLogSection";
import { ReservationHistorySection } from "./ReservationHistorySection";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_MANAGER_UI_STRINGS,
  PLACEHOLDER_EQUIPMENT_IMAGE,
  getEquipmentStatusVariant,
} from "@/lib/config/constants";
import type { EquipmentSearchItem } from "@/types";
import { useEquipmentDetails } from "@/hooks/useEquipmentDetails";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

export interface EquipmentDetailsContentProps {
  equipment: EquipmentSearchItem;
  showAdminLogs?: boolean;
}

/**
 * Shared presentation component for equipment details.
 * Used by both EquipmentDetailsSheet and EquipmentDetailsView.
 */
export function EquipmentDetailsContent({
  equipment,
  showAdminLogs = true,
}: EquipmentDetailsContentProps) {
  const {
    maintenanceLogs,
    isLogsLoading,
    reservationHistory,
    isReservationsLoading,
    addMaintenanceLog,
    isMutating,
  } = useEquipmentDetails(equipment.id);

  return (
    <div className="space-y-6 py-6 px-4 sm:px-6">
      <div className="space-y-4">
        <div className="aspect-video rounded-lg bg-muted overflow-hidden">
          <img
            src={equipment.imagePath ?? PLACEHOLDER_EQUIPMENT_IMAGE}
            alt={equipment.name ?? equipment.type.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{equipment.name || equipment.type.name}</h2>
            <Badge
              variant={getEquipmentStatusVariant(equipment.status)}
              className={
                equipment.status === "ok"
                  ? "bg-green-600 hover:bg-green-700 text-white border-transparent"
                  : undefined
              }
            >
              {EQUIPMENT_STATUS_LABELS[equipment.status] || equipment.status}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {equipment.internalId} • {equipment.type.name}
          </p>

          {equipment.description && (
            <p className="text-muted-foreground">{equipment.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg border bg-muted/50 p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {UI.INTERNAL_ID}
              </p>
              <p className="font-mono font-medium">{equipment.internalId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{UI.TYPE}</p>
              <p className="font-medium">{equipment.type.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {UI.CREDIT_COST}
              </p>
              <p className="font-medium tabular-nums">
                {equipment.type.creditCostPerDay} godzinek/dzień
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{UI.STATUS}</p>
              <p className="font-medium capitalize">
                {EQUIPMENT_STATUS_LABELS[equipment.status] || equipment.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAdminLogs && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">{UI.MAINTENANCE_HISTORY}</h3>
          {isLogsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <MaintenanceLogSection
              logs={maintenanceLogs}
              equipmentId={equipment.id}
              onAddLog={addMaintenanceLog}
              isSubmitting={isMutating}
            />
          )}
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">{UI.RESERVATION_HISTORY}</h3>
        {isReservationsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <ReservationHistorySection reservations={reservationHistory} />
        )}
      </div>
    </div>
  );
}
