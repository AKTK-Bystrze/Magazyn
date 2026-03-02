import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipmentDetails } from "@/hooks/useEquipmentDetails";
import { MaintenanceLogSection } from "./MaintenanceLogSection";
import { ReservationHistorySection } from "./ReservationHistorySection";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_MANAGER_UI_STRINGS,
  PLACEHOLDER_EQUIPMENT_IMAGE,
} from "@/lib/config/constants";
import type { EquipmentSearchItem } from "@/types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for EquipmentDetailsSheet component
 */
interface EquipmentDetailsSheetProps {
  /** Whether sheet is open */
  isOpen: boolean;
  /** Equipment item to show details for (passed from list for initial display) */
  equipment: EquipmentSearchItem | null;
  /** Callback when sheet closes */
  onClose: () => void;
  /** Whether the sheet is in read-only mode */
  readOnly?: boolean;
}

/**
 * Returns badge variant based on equipment status
 */
function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ok":
      return "default";
    case "broken":
      return "destructive";
    case "blocked":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Side sheet showing full equipment details including maintenance history
 */
export function EquipmentDetailsSheet({
  isOpen,
  equipment,
  onClose,
  readOnly = false,
}: EquipmentDetailsSheetProps) {
  const { 
    maintenanceLogs, 
    isLogsLoading, 
    reservationHistory,
    isReservationsLoading,
    addMaintenanceLog, 
    isMutating 
  } = useEquipmentDetails(equipment?.id ?? null);

  // Guard: don't render content if no equipment
  if (!equipment) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{UI.DETAILS_TITLE}</SheetTitle>
          </SheetHeader>
          <div className="py-8 text-center text-muted-foreground">
            No equipment selected
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg overflow-y-auto" data-testid="equipment-details-sheet">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{UI.DETAILS_TITLE}</SheetTitle>
          <SheetDescription>
            {equipment.internalId} • {equipment.type.name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Hero Section */}
          <div className="space-y-4">
            {/* Equipment Image */}
            <div className="aspect-video rounded-lg bg-muted overflow-hidden">
              <img
                src={equipment.imagePath ?? PLACEHOLDER_EQUIPMENT_IMAGE}
                alt={equipment.name ?? equipment.type.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Equipment Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {equipment.name || equipment.type.name}
                </h2>
                <Badge variant={getStatusVariant(equipment.status)}>
                  {EQUIPMENT_STATUS_LABELS[equipment.status] || equipment.status}
                </Badge>
              </div>

              {equipment.description && (
                <p className="text-muted-foreground">{equipment.description}</p>
              )}

              {/* Equipment Details Grid */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {UI.INTERNAL_ID}
                  </p>
                  <p className="font-mono font-medium">{equipment.internalId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {UI.TYPE}
                  </p>
                  <p className="font-medium">{equipment.type.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {UI.CREDIT_COST}
                  </p>
                  <p className="font-medium tabular-nums">
                    {equipment.type.creditCostPerDay} credits/day
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {UI.STATUS}
                  </p>
                  <p className="font-medium capitalize">
                    {EQUIPMENT_STATUS_LABELS[equipment.status] || equipment.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance History Section */}
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
                  readOnly={readOnly}
              />
            )}
          </div>

          {/* Reservation History Section */}
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
      </SheetContent>
    </Sheet>
  );
}
