import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { AvailabilityCheckResult } from "@/types/reservation-cart.types";

/**
 * Props for the CartAvailabilityAlerts component.
 */
export interface CartAvailabilityAlertsProps {
  /** Submission error message if cart checkout failed */
  submissionError: string | null;
  /** Result of equipment availability pre-check */
  availabilityResult: AvailabilityCheckResult;
  /** Optional path to navigate back to equipment browse */
  equipmentBrowsePath?: string;
  /** Current user ID for checking reservation view permissions */
  currentUserId?: string;
  /** Whether the current user is an admin */
  isAdmin?: boolean;
}

/**
 * Component for rendering submission errors and equipment availability conflicts.
 * Automatically scrolls into view when errors or conflicts are detected.
 */
export function CartAvailabilityAlerts({
  submissionError,
  availabilityResult,
  equipmentBrowsePath,
  currentUserId,
  isAdmin = false,
}: CartAvailabilityAlertsProps) {
  const localRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (
      (!availabilityResult.isAllAvailable && availabilityResult.unavailableItems.length > 0) ||
      submissionError
    ) {
      setTimeout(() => {
        localRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    }
  }, [
    availabilityResult.isAllAvailable,
    availabilityResult.unavailableItems.length,
    submissionError,
  ]);

  if (
    !submissionError &&
    (availabilityResult.isAllAvailable || availabilityResult.unavailableItems.length === 0)
  ) {
    return null;
  }

  return (
    <div ref={localRef} className="space-y-4">
      {submissionError && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className="h-4 w-4" />
          <h5 className="mb-1 font-medium leading-none tracking-tight">
            Rezerwacja Nie Powiodła Się
          </h5>
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      {!availabilityResult.isAllAvailable && availabilityResult.unavailableItems.length > 0 && (
        <Alert
          className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
          data-testid="error-reservation-conflict"
        >
          <AlertCircle className="h-4 w-4" />
          <h5 className="mb-1 font-medium leading-none tracking-tight">
            Wykryto Problemy z Dostępnością
          </h5>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              {availabilityResult.unavailableItems.map((item) => (
                <li key={item.equipmentId}>
                  <a
                    href={`/equipment/${item.equipmentId}`}
                    className="underline font-bold hover:text-foreground"
                  >
                    {item.name}
                  </a>
                  : {item.reason}
                  {item.conflictingReservations && item.conflictingReservations.length > 0 && (
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Konfliktujące rezerwacje:</span>
                      <ul className="list-none pl-4 mt-1 space-y-1">
                        {item.conflictingReservations.map((conflict, idx) => (
                          <li key={idx} className="text-xs flex flex-wrap items-center gap-1.5">
                            <span>
                              • {conflict.startDate} do {conflict.endDate}
                            </span>
                            {conflict.username && (
                              <span className="text-muted-foreground">
                                (rezerwujący:{" "}
                                <span className="font-medium text-foreground">
                                  {conflict.username}
                                </span>
                                )
                              </span>
                            )}
                            {conflict.id &&
                              (isAdmin || (currentUserId && conflict.userId === currentUserId)) && (
                                <a
                                  href={`/reservations/${conflict.id}`}
                                  className="underline font-medium hover:text-foreground"
                                >
                                  Szczegóły
                                </a>
                              )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm">Proszę usunąć te przedmioty lub zmienić daty.</p>
            {equipmentBrowsePath && (
              <div className="mt-3">
                <a
                  href={equipmentBrowsePath}
                  className="inline-flex items-center gap-1 text-sm font-medium underline hover:text-foreground"
                >
                  ← Wróć do listy sprzętu
                </a>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
