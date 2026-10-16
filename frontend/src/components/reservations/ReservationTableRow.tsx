import * as React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { ReservationActionMenu } from "./ReservationActionMenu";
import type { ReservationListItem } from "@/types";
import { formatDate } from "@/lib/utils/date-utils";

/**
 * Props for the ReservationTableRow component.
 */
export interface ReservationTableRowProps {
  /** The reservation item to display */
  item: ReservationListItem;
  /** Whether to display the username column */
  showUserColumn: boolean;
  /** Current authenticated user's ID for highlighting "(Ty)" */
  currentUserId?: string;
  /** View mode: 'user' or 'admin' */
  mode: "user" | "admin";
  /** View scope: 'my' or 'all' */
  scope: "my" | "all";
  /** Callback to view reservation details */
  onViewDetails: (item: ReservationListItem) => void;
  /** Optional callback to modify reservation */
  onModify?: (item: ReservationListItem) => void;
  /** Optional callback to cancel reservation */
  onCancel?: (item: ReservationListItem) => void;
  /** Optional callback to return reservation */
  onReturn?: (item: ReservationListItem) => void;
}

/**
 * Format date string for mobile compact display (DD.MM).
 */
function formatDateMobile(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

/**
 * Single table row rendering responsive mobile and desktop representations of a reservation.
 */
export function ReservationTableRow({
  item,
  showUserColumn,
  currentUserId,
  mode,
  scope,
  onViewDetails,
  onModify,
  onCancel,
  onReturn,
}: ReservationTableRowProps) {
  const handleRowClick = () => {
    onViewDetails(item);
  };

  const actionMenu = (
    <ReservationActionMenu
      item={item}
      mode={mode}
      scope={scope}
      onViewDetails={onViewDetails}
      onModify={onModify}
      onCancel={onCancel}
      onReturn={onReturn}
    />
  );

  return (
    <TableRow
      className="hover:bg-muted/50 cursor-pointer"
      onClick={handleRowClick}
      data-testid={`reservation-row-${item.id}`}
    >
      {showUserColumn && (
        <TableCell className="md:hidden truncate max-w-[100px] text-sm">{item.username}</TableCell>
      )}
      <TableCell className="md:hidden whitespace-nowrap text-sm">
        {formatDateMobile(item.startDate)} - {formatDateMobile(item.endDate)}
      </TableCell>
      <TableCell className="md:hidden font-medium truncate max-w-[120px]">
        {item.equipmentName}
      </TableCell>
      <TableCell className="md:hidden">
        <StatusBadge
          status={item.status}
          className="whitespace-nowrap text-xs"
          data-testid={`reservation-status-${item.id}`}
        />
      </TableCell>
      <TableCell className="md:hidden text-right">{actionMenu}</TableCell>

      <TableCell className="hidden md:table-cell">
        <div className="font-medium truncate max-w-[200px]" title={item.equipmentName}>
          {item.equipmentName}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
        {item.equipmentType}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <StatusBadge
          status={item.status}
          className="whitespace-nowrap"
          data-testid={`reservation-status-${item.id}`}
        />
      </TableCell>
      <TableCell className="hidden md:table-cell whitespace-nowrap">
        {formatDate(item.startDate)}
      </TableCell>
      <TableCell className="hidden md:table-cell whitespace-nowrap">
        {formatDate(item.endDate)}
      </TableCell>
      <TableCell className="hidden md:table-cell text-right font-medium">
        {item.creditCost}
      </TableCell>
      {showUserColumn && (
        <TableCell className="hidden xl:table-cell truncate max-w-[150px]">
          {item.username}
          {item.userId === currentUserId && " (Ty)"}
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell">{actionMenu}</TableCell>
    </TableRow>
  );
}
