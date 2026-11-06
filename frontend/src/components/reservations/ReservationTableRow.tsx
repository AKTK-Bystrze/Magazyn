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
  /** Callback to view reservation details */
  onViewDetails: (item: ReservationListItem) => void;
  /** Optional callback to modify reservation */
  onModify?: (item: ReservationListItem) => void;
  /** Optional callback to cancel reservation */
  onCancel?: (item: ReservationListItem) => void;
  /** Optional callback to return reservation */
  onReturn?: (item: ReservationListItem) => void;
  /** Optional callback to pickup/rent reservation */
  onRent?: (item: ReservationListItem) => void;
  /** Optional view mode */
  mode?: "user" | "admin";
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
  onViewDetails,
  onModify,
  onCancel,
  onReturn,
  onRent,
  mode,
}: ReservationTableRowProps) {
  const isOwn = currentUserId ? item.userId === currentUserId : false;
  const canAct = mode === "admin" || isOwn;
  const actions = canAct ? { onModify, onCancel, onReturn, onRent } : {};

  const actionMenu = (
    <ReservationActionMenu item={item} mode={mode} onViewDetails={onViewDetails} {...actions} />
  );

  return (
    <TableRow
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onViewDetails(item)}
      data-testid={`reservation-row-${item.id}`}
    >
      {showUserColumn && (
        <TableCell className="md:hidden truncate max-w-[100px] text-sm">{item.username}</TableCell>
      )}
      <TableCell className="md:hidden whitespace-nowrap text-sm">
        <a
          href={`/reservations/${item.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {formatDateMobile(item.startDate)} - {formatDateMobile(item.endDate)}
        </a>
      </TableCell>
      <TableCell className="md:hidden font-medium truncate max-w-[120px]">
        <a
          href={`/equipment/${item.equipmentId}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {item.equipmentName}
        </a>
      </TableCell>
      <TableCell className="md:hidden">
        <StatusBadge
          status={item.status}
          startDate={item.startDate}
          endDate={item.endDate}
          className="whitespace-nowrap text-xs"
          data-testid={`reservation-status-${item.id}`}
        />
      </TableCell>
      <TableCell className="md:hidden text-right">{actionMenu}</TableCell>

      <TableCell className="hidden md:table-cell">
        <div className="font-medium truncate max-w-[200px]" title={item.equipmentName}>
          <a
            href={`/equipment/${item.equipmentId}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item.equipmentName}
          </a>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
        {item.equipmentType}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <StatusBadge
          status={item.status}
          startDate={item.startDate}
          endDate={item.endDate}
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
