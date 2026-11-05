import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useEquipmentDetails } from "@/hooks/useEquipmentDetails";
import { ICON_SIZE_SM } from "@/lib/config/constants";
import { ROUTES } from "@/lib/config/routes";
import { EquipmentDetailsContent } from "./EquipmentDetailsContent";

interface EquipmentDetailsViewProps {
  equipmentId: string;
  isAdmin?: boolean;
}

/**
 * Main equipment details view component for standalone /equipment/[id] route.
 * Reuses EquipmentDetailsContent for presentation.
 */
export function EquipmentDetailsView(props: EquipmentDetailsViewProps) {
  return (
    <QueryProvider>
      <EquipmentDetailsViewContent {...props} />
    </QueryProvider>
  );
}

function EquipmentDetailsViewContent({ equipmentId, isAdmin = false }: EquipmentDetailsViewProps) {
  const { equipment, isLoading, error } = useEquipmentDetails(equipmentId);
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <a
        href={backPath}
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft className={ICON_SIZE_SM} />
        Powrót do sprzętu
      </a>
      <div className="rounded-lg border bg-card">
        <EquipmentDetailsContent equipment={equipment} showAdminLogs={isAdmin} />
      </div>
    </div>
  );
}
