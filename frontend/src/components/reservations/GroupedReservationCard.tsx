import * as React from "react";
import type { GroupedReservation, ReservationListItem } from "@/types";
import { RESERVATION_STATUS } from "@/lib/config/constants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ReservationCard } from "./ReservationCard";
import { ChevronDown, ChevronRight, Calendar, CreditCard, User } from "lucide-react";
import { formatDate, calculateDays } from "@/lib/utils/date-utils";

/**
 * Props for GroupedReservationCard component
 */
interface GroupedReservationCardProps {
  group: GroupedReservation;
  isExpanded: boolean;
  scope: "my" | "all";
  currentUserId?: string;
  onToggle: () => void;
  onCancelAll: () => void;
  onModifyDatesAll: () => void;
  onReturnAll?: () => void;
  onCancelSingle: (reservation: ReservationListItem) => void;
  onModifySingle: (reservation: ReservationListItem) => void;
  onReturnSingle?: (reservation: ReservationListItem) => void;
  mode: "user" | "admin";
}

/**
 * Expandable card component for grouped reservations
 * Shows summary when collapsed, individual items when expanded
 */
export function GroupedReservationCard({
  group,
  isExpanded,
  scope,
  currentUserId,
  onToggle,
  onCancelAll,
  onModifyDatesAll,
  onReturnAll,
  onCancelSingle,
  onModifySingle,
  onReturnSingle,
  mode,
}: GroupedReservationCardProps) {
  const days = calculateDays(group.startDate, group.endDate);
  const canBulkModify = group.status === RESERVATION_STATUS.PENDING;
  const canBulkReturn =
    group.status === RESERVATION_STATUS.PENDING || group.status === RESERVATION_STATUS.RENTED;
  // Regular users: actions only in "My Reservations"
  // Admins: actions in both "My Reservations" and "All Reservations"
  const showActions = mode === "admin" || scope === "my";
  const isOwn = currentUserId ? group.userId === currentUserId : false;

  return (
    <Card
      className="w-full max-w-full overflow-hidden transition-shadow hover:shadow-md border-l-[16px] border-l-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10"
      data-testid={`reservation-row-${group.groupKey}`}
    >
      {/* Header - Clickable to expand/collapse */}
      <CardHeader
        className="cursor-pointer select-none p-4 sm:p-6 bg-muted/10 hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3 w-full">
          <div className="pt-0.5">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* User Row */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-foreground text-sm truncate min-w-0 flex-1">
                  {group.username}
                  {scope === "all" && isOwn && " (Ty)"}
                </span>
              </div>
              <StatusBadge status={group.status} />
            </div>

            {/* Dates Row */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 break-words">
                  <div className="font-medium">
                    {formatDate(group.startDate)} → {formatDate(group.endDate)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {days} {days === 1 ? "dzień" : "dni"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-semibold flex-shrink-0">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>{group.totalCreditCost}</span>
                <span className="text-xs text-muted-foreground">godzinek</span>
              </div>
            </div>

            {/* Equipment list */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="text-sm text-muted-foreground break-words line-clamp-2 flex-1">
                {group.items.map((item, index) => (
                  <span key={item.id}>
                    {item.equipmentName}
                    {index < group.items.length - 1 && ", "}
                  </span>
                ))}
              </div>
              <div className="text-sm text-muted-foreground flex-shrink-0 font-medium whitespace-nowrap">
                {group.items.length}{" "}
                {group.items.length === 1
                  ? "element"
                  : group.items.length % 10 >= 2 &&
                      group.items.length % 10 <= 4 &&
                      (group.items.length % 100 < 10 || group.items.length % 100 >= 20)
                    ? "elementy"
                    : "elementów"}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-6 space-y-4">
          {/* Bulk Actions */}
          {showActions && (canBulkModify || canBulkReturn) && (
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {canBulkModify && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-auto py-2 whitespace-normal text-left sm:text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onModifyDatesAll();
                  }}
                >
                  Zmień Daty dla Wszystkich
                </Button>
              )}
              {canBulkReturn && onReturnAll && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-auto py-2 whitespace-normal text-left sm:text-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReturnAll();
                  }}
                >
                  Zwróć Wszystkie
                </Button>
              )}
              {canBulkModify && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto h-auto py-2 whitespace-normal text-left sm:text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelAll();
                  }}
                >
                  Anuluj Wszystkie
                </Button>
              )}
            </div>
          )}

          {/* Individual Items */}
          <div className="space-y-3">
            {group.items.map((item) => {
              const itemIsOwn = currentUserId ? item.userId === currentUserId : false;
              return (
                <ReservationCard
                  key={item.id}
                  reservation={item}
                  isOwn={itemIsOwn}
                  showOwnershipBadge={scope === "all"}
                  showActions={showActions}
                  onCancel={showActions ? () => onCancelSingle(item) : undefined}
                  onModify={showActions ? () => onModifySingle(item) : undefined}
                  onReturn={showActions && onReturnSingle ? () => onReturnSingle(item) : undefined}
                  mode={mode}
                />
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
