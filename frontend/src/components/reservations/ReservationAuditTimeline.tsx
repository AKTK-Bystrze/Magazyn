import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Clock, User } from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils/date-utils";
import {
  ICON_SIZE_SM,
  RESERVATION_STATUS_VIEW_UI_STRINGS as UI,
} from "@/lib/config/constants";
import type { ReservationAuditEntry } from "@/types";

interface ReservationAuditTimelineProps {
  auditTrail: ReservationAuditEntry[];
}

/**
 * Displays chronological history of all reservation changes
 * Shows status changes with timestamps and who made each change
 *
 * @param auditTrail - Array of audit entries from reservation
 */
export function ReservationAuditTimeline({
  auditTrail,
}: ReservationAuditTimelineProps) {
  // Sort by createdAt descending (newest first for display)
  const sortedEntries = React.useMemo(
    () => auditTrail ? [...auditTrail].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) : [],
    [auditTrail]
  );

  if (!auditTrail || auditTrail.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{UI.AUDIT_HISTORY}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {sortedEntries.map((entry, index) => {
            const isInitial = index === sortedEntries.length - 1;
            const formattedDate = formatDate(entry.createdAt);
            const relativeTime = formatRelativeTime(entry.createdAt);

            return (
              <div key={entry.id} className="relative pl-10 pb-4">
                {/* Timeline dot */}
                <div
                  className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 ${
                    isInitial
                      ? "bg-primary border-primary"
                      : "bg-background border-muted-foreground"
                  }`}
                />

                {/* Entry content */}
                <div className="space-y-2">
                  {/* Status and timestamp */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={entry.status} />
                    {isInitial && (
                      <span className="text-xs text-muted-foreground">
                        {UI.INITIAL_CREATION}
                      </span>
                    )}
                  </div>

                  {/* Changed by */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className={ICON_SIZE_SM} />
                    <span>
                      {UI.CHANGED_BY}{" "}
                      <span className="font-medium text-foreground">
                        {entry.changedByUsername || UI.SYSTEM}
                      </span>
                    </span>
                  </div>

                  {/* Date and relative time */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className={ICON_SIZE_SM} />
                    <span>
                      {formattedDate} • {relativeTime}
                    </span>
                  </div>

                  {/* Date range (if different from primary reservation) */}
                  {!isInitial && (
                    <div className="text-xs text-muted-foreground">
                      {formatDate(entry.startDate)} —{" "}
                      {formatDate(entry.endDate)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
