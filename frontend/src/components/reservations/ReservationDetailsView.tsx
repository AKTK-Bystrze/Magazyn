import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "./StatusBadge";
import { ReservationStatusActions } from "./ReservationStatusActions";
import { ReservationAuditTimeline } from "./ReservationAuditTimeline";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useReservationDetail } from "@/hooks/useReservationDetail";
import { formatDate, calculateDays, formatDateLocalized } from "@/lib/utils/date-utils";
import {
  ICON_SIZE_SM,
  RESERVATION_STATUS_VIEW_UI_STRINGS as UI,
} from "@/lib/config/constants";
import { ROUTES } from "@/lib/config/routes";
import type { Enums } from "@/db/database.types";

interface ReservationDetailsViewProps {
  reservationId: string;
  currentUserId: string;
  currentUserBalance: number;
  isAdmin: boolean;
}

/**
 * Main view for reservation details with status management
 * Shows reservation info, audit history, and available actions
 *
 * @param reservationId - ID of reservation to display
 * @param currentUserId - ID of logged-in user
 * @param isAdmin - Whether user has admin privileges
 */
export function ReservationDetailsView({
  reservationId,
  currentUserId,
  currentUserBalance,
  isAdmin,
}: ReservationDetailsViewProps) {
  const { reservation, isLoading, error, updateStatus, isUpdating } =
    useReservationDetail(reservationId);

  // Update breadcrumb label when data is loaded
  React.useEffect(() => {
    if (reservation) {
      const label = `${formatDate(reservation.startDate)} - ${formatDate(reservation.endDate)}: ${reservation.equipmentName}`;
      const event = new CustomEvent("magazyn:breadcrumb-label", {
        detail: {
          path: window.location.pathname,
          label: label,
        },
      });
      window.dispatchEvent(event);
    }
  }, [reservation]);

  const handleStatusChange = async (
    newStatus: Enums<"reservation_status">
  ) => {
    await updateStatus({ status: newStatus });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !reservation) {
    const errorMessage =
      error?.message === "403"
        ? UI.UNAUTHORIZED
        : error?.message === "404"
        ? UI.NOT_FOUND
        : UI.NETWORK_ERROR;

    return (
      <div className="space-y-6">
        <a
          href={ROUTES.PROTECTED.RESERVATIONS}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className={ICON_SIZE_SM} />
          {UI.BACK_TO_LIST}
        </a>
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className={ICON_SIZE_SM + " text-destructive"} />
          <AlertDescription className="text-destructive">
            {errorMessage}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const days = calculateDays(reservation.startDate, reservation.endDate);
  const isOwner = reservation.userId === currentUserId;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between gap-4">
        <a
          href={ROUTES.PROTECTED.RESERVATIONS}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className={ICON_SIZE_SM} />
          {UI.BACK_TO_LIST}
        </a>
        <StatusBadge status={reservation.status} />
      </div>

      {/* Equipment Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {reservation.equipmentName}
        </h1>
        <p className="text-muted-foreground text-lg mt-1">
          {reservation.equipmentType} • {reservation.equipmentInternalId}
        </p>
      </div>

      {/* Reservation Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>{UI.RESERVATION_INFO}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User info (admin view or not owner) */}
          {(isAdmin || !isOwner) && (
            <div className="flex items-start gap-3">
              <User className={ICON_SIZE_SM + " text-muted-foreground mt-0.5"} />
              <div className="flex-1">
                <p className="font-medium">{reservation.username}</p>
                <p className="text-sm text-muted-foreground">
                  {reservation.userEmail}
                </p>
              </div>
            </div>
          )}

          {/* Date range */}
          <div className="flex items-start gap-3">
            <Calendar className={ICON_SIZE_SM + " text-muted-foreground mt-0.5"} />
            <div className="flex-1">
              <p className="font-medium">{UI.DATES}</p>
              <p className="text-sm">
                <span data-testid="reservation-start-date">{formatDate(reservation.startDate)}</span> —{" "}
                <span data-testid="reservation-end-date">{formatDate(reservation.endDate)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {days} {days === 1 ? "dzień" : "dni"}
              </p>
            </div>
          </div>

          {/* Credit cost */}
          <div className="flex items-start gap-3">
            <CreditCard className={ICON_SIZE_SM + " text-muted-foreground mt-0.5"} />
            <div className="flex-1">
              <p className="font-medium">{UI.CREDIT_COST}</p>
              <p className="text-sm">{reservation.creditCost} godzinki</p>
            </div>
          </div>

          {/* Created at */}
          <div className="flex items-start gap-3">
            <Clock className={ICON_SIZE_SM + " text-muted-foreground mt-0.5"} />
            <div className="flex-1">
              <p className="font-medium">{UI.CREATED_AT}</p>
              <p className="text-sm">
                {formatDateLocalized(reservation.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Actions */}
      <ReservationStatusActions
        reservation={reservation}
        currentUserId={currentUserId}
        currentUserBalance={currentUserBalance}
        isAdmin={isAdmin}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdating}
      />

      {/* Audit History */}
      <ReservationAuditTimeline auditTrail={reservation.auditTrail} />
    </div>
  );
}
