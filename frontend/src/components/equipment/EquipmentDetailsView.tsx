import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

/**
 * Main equipment details view component.
 * Wraps content in QueryProvider for isolated React island mounting.
 */
export function EquipmentDetailsView(props: EquipmentDetailsViewProps) {
  return (
    <QueryProvider>
      <EquipmentDetailsContent {...props} />
    </QueryProvider>
  );
}

function EquipmentDetailsContent({ equipmentId, isAdmin = false }: EquipmentDetailsViewProps) {
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
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

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {equipment.name || equipment.type.name}
        </h1>
        <p className="text-muted-foreground text-lg mt-1">
          {equipment.internalId} • {equipment.type.name}
        </p>
      </div>

      <div className="aspect-video max-h-96 rounded-lg bg-muted overflow-hidden">
        <img
          src={equipment.imagePath ?? PLACEHOLDER_EQUIPMENT_IMAGE}
          alt={equipment.name ?? equipment.type.name}
          className="w-full h-full object-cover"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{UI.DETAILS_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>{UI.MAINTENANCE_HISTORY}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{UI.RESERVATION_HISTORY}</CardTitle>
        </CardHeader>
        <CardContent>
          {isReservationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <ReservationHistorySection reservations={reservationHistory} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
