import * as React from "react";
import type { GroupedReservation, ReservationListItem } from "@/types";
import { RESERVATION_STATUS } from "@/lib/config/constants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      className="overflow-hidden transition-shadow hover:shadow-md border-l-4 border-l-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10"
      data-testid={`reservation-row-${group.groupKey}`}
    >
      {/* Header - Clickable to expand/collapse */}
      <div
        className="cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg truncate">
                  Rezerwacja Grupowa ({group.items.length}{" "}
                  {group.items.length === 1
                    ? "element"
                    : group.items.length % 10 >= 2 &&
                        group.items.length % 10 <= 4 &&
                        (group.items.length % 100 < 10 || group.items.length % 100 >= 20)
                      ? "elementy"
                      : "elementów"}
                  )
                </h3>
                {scope === "all" && isOwn && (
                  <Badge variant="secondary" className="text-xs">
                    Twoja rezerwacja
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {group.items.map((item) => item.equipmentName).join(", ")}
              </p>
            </div>
            <StatusBadge status={group.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {(mode === "admin" || scope === "all") && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{group.username}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatDate(group.startDate)} — {formatDate(group.endDate)}
            </span>
            <span className="text-muted-foreground">
              ({days} {days === 1 ? "dzień" : "dni"})
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{group.totalCreditCost} godzinek</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              {isExpanded ? (
                <>
                  Zwiń <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  Rozwiń <ChevronRight className="h-4 w-4" />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-2 space-y-4 border-t bg-background/50">
          {/* Bulk Actions */}
          {showActions && (canBulkModify || canBulkReturn) && (
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {canBulkModify && (
                <Button
                  variant="outline"
                  size="sm"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onReturnAll();
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/20"
                >
                  Zwróć Wszystkie
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
