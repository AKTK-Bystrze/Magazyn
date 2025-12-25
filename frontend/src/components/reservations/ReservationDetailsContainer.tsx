import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ReservationDetailsView } from "./ReservationDetailsView";

interface ReservationDetailsContainerProps {
  reservationId: string;
  currentUserId: string;
  currentUserBalance: number;
  isAdmin: boolean;
}

/**
 * Container that wraps ReservationDetailsView with QueryProvider
 * This ensures React Query context is available to the component
 */
export function ReservationDetailsContainer({
  reservationId,
  currentUserId,
  currentUserBalance,
  isAdmin,
}: ReservationDetailsContainerProps) {
  return (
    <QueryProvider>
      <ReservationDetailsView
        reservationId={reservationId}
        currentUserId={currentUserId}
        currentUserBalance={currentUserBalance}
        isAdmin={isAdmin}
      />
    </QueryProvider>
  );
}
