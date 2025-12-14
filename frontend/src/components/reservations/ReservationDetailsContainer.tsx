import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ReservationDetailsView } from "./ReservationDetailsView";

interface ReservationDetailsContainerProps {
  reservationId: string;
  currentUserId: string;
  isAdmin: boolean;
}

/**
 * Container that wraps ReservationDetailsView with QueryProvider
 * This ensures React Query context is available to the component
 */
export function ReservationDetailsContainer({
  reservationId,
  currentUserId,
  isAdmin,
}: ReservationDetailsContainerProps) {
  return (
    <QueryProvider>
      <ReservationDetailsView
        reservationId={reservationId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </QueryProvider>
  );
}
