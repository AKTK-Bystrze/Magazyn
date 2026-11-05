import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useEquipmentDetails } from "@/hooks/useEquipmentDetails";
import { MaintenanceLogSection } from "./MaintenanceLogSection";
import { ReservationHistorySection } from "./ReservationHistorySection";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_MANAGER_UI_STRINGS,
  PLACEHOLDER_EQUIPMENT_IMAGE,
  ICON_SIZE_SM,
  getEquipmentStatusVariant,
} from "@/lib/config/constants";
import { ROUTES } from "@/lib/config/routes";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

interface EquipmentDetailsViewProps {
  equipmentId: string;
  isAdmin?: boolean;
  currentUserId?: string;
}

/**
 * Single equipment details view for all users and flows (/equipment/[id]).
 * Displays equipment specifications, conservation/maintenance history, and reservation history.
 */
export function EquipmentDetailsView(props: EquipmentDetailsViewProps) {
  return (
    <QueryProvider>
      <EquipmentDetailsViewContent {...props} />
    </QueryProvider>
  );
}

function EquipmentDetailsViewContent({
  equipmentId,
  isAdmin = false,
  currentUserId,
}: EquipmentDetailsViewProps) {
  const {
    equipment,
    maintenanceLogs,
    isLogsLoading,
    reservationHistory,
    isReservationsLoading,
    addMaintenanceLog,
    isMutating,
    isLoading,
    error,
  } = useEquipmentDetails(equipmentId);

  const backPath = isAdmin ? ROUTES.PROTECTED.ADMIN_EQUIPMENT : ROUTES.PUBLIC.EQUIPMENT;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <a
          href={backPath}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className={ICON_SIZE_SM} />
          Powrót do sprzętu
        </a>
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className={ICON_SIZE_SM + " text-destructive"} />
          <AlertDescription className="text-destructive">
            Nie znaleziono sprzętu lub wystąpił błąd ładowania.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6" data-testid="equipment-details-view">
      <div className="flex items-center justify-between gap-4">
        <a
          href={backPath}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className={ICON_SIZE_SM} />
          Powrót do sprzętu
        </a>
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

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div className="space-y-4">
          <div className="aspect-video max-h-96 rounded-lg bg-muted overflow-hidden">
            <img
              src={equipment.imagePath ?? PLACEHOLDER_EQUIPMENT_IMAGE}
              alt={equipment.name ?? equipment.type.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {equipment.name || equipment.type.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {equipment.internalId} • {equipment.type.name}
              </p>
            </div>

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

        {/* Conservation / Maintenance history and entry creation - available for all users */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">{UI.MAINTENANCE_HISTORY}</h2>
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

        {/* Reservation history */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">{UI.RESERVATION_HISTORY}</h2>
          {isReservationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <ReservationHistorySection
              reservations={reservationHistory}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
}
