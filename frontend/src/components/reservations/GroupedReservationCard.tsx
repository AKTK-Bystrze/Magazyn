import * as React from "react";
import type { GroupedReservation, ReservationListItem } from "@/types";
import { RESERVATION_STATUS } from "@/lib/config/constants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ReservationCard } from "./ReservationCard";
import { ChevronDown, ChevronRight, Calendar, CreditCard, User } from "lucide-react";
import { formatDate, calculateDays } from "@/lib/utils/date-utils";
import { pluralize } from "@/lib/utils/text-utils";

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
    group.status === RESERVATION_STATUS.PENDING ||
    group.status === RESERVATION_STATUS.RENTED;
  const showActions = mode === "admin" || (mode === "user" && scope === "my");
  const isOwn = currentUserId ? group.userId === currentUserId : false;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Header - Clickable to expand/collapse */}
      <CardHeader
        className="cursor-pointer select-none bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}

            <div className="flex flex-col gap-3 flex-1 min-w-0">
              {/* User (Admin or All Reservations view) */}
              {(mode === "admin" || scope === "all") && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground text-sm">
                    {group.username}
                    {scope === "all" && isOwn && " (You)"}
                  </span>
                </div>
              )}
              {/* Date and Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="font-medium">
                      {formatDate(group.startDate)} → {formatDate(group.endDate)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {days} {pluralize(days, "day")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={group.status} />
                  <div className="text-sm text-muted-foreground">
                    {group.items.length} {pluralize(group.items.length, "item")}
                  </div>
                </div>
              </div>

              {/* Equipment Names List */}
              <div className="text-sm text-muted-foreground">
                {group.items.map((item, index) => (
                  <span key={item.id}>
                    {item.equipmentName}
                    {index < group.items.length - 1 && ", "}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 font-semibold">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>{group.totalCreditCost}</span>
              <span className="text-xs text-muted-foreground">credits</span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-6 space-y-4">
          {/* Bulk Actions */}
          {showActions && (canBulkModify || canBulkReturn) && (
            <div className="flex gap-2 pb-4 border-b overflow-x-auto">
              {canBulkModify && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onModifyDatesAll();
                  }}
                >
                  Modify Dates for All
                </Button>
              )}
              {canBulkReturn && onReturnAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReturnAll();
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/20"
                >
                  Return All
                </Button>
              )}
              {canBulkModify && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelAll();
                  }}
                >
                  Cancel All
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
                  isOwn={scope === "all" && itemIsOwn}
                  showActions={showActions}
                  onCancel={showActions ? () => onCancelSingle(item) : undefined}
                  onModify={showActions ? () => onModifySingle(item) : undefined}
                  onReturn={
                    showActions && onReturnSingle
                      ? () => onReturnSingle(item)
                      : undefined
                  }
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
