import * as React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SortConfig } from "@/lib/hooks/useTableSort";

/**
 * Props for the ReservationTableHeader component.
 */
export interface ReservationTableHeaderProps {
  /** Whether to display the username column (admin mode or all scope) */
  showUserColumn: boolean;
  /** Current active sort configuration */
  sortConfig: SortConfig | null;
  /** Callback to request sorting by column key */
  requestSort: (key: string) => void;
}

const MOBILE_COLS = [
  { key: "username", label: "Użytkownik", requiresUser: true },
  { key: "dates", label: "Daty" },
  { key: "equipmentName", label: "Sprzęt" },
  { key: "status", label: "Status" },
];

const DESKTOP_COLS = [
  { key: "equipmentName", label: "Sprzęt", className: "hidden md:table-cell cursor-pointer" },
  { key: "equipmentType", label: "Typ", className: "hidden md:table-cell cursor-pointer" },
  { key: "status", label: "Status", className: "hidden md:table-cell cursor-pointer" },
  { key: "startDate", label: "Od", className: "hidden md:table-cell cursor-pointer" },
  { key: "endDate", label: "Do", className: "hidden md:table-cell cursor-pointer" },
  {
    key: "creditCost",
    label: "Koszt",
    className: "hidden md:table-cell text-right cursor-pointer",
  },
  {
    key: "username",
    label: "Użytkownik",
    className: "hidden xl:table-cell cursor-pointer",
    requiresUser: true,
  },
];

/**
 * Header row for reservation table with responsive desktop and mobile columns and sort indicators.
 */
export function ReservationTableHeader({
  showUserColumn,
  sortConfig,
  requestSort,
}: ReservationTableHeaderProps) {
  const getIndicator = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  return (
    <TableHeader>
      <TableRow>
        {MOBILE_COLS.filter((col) => !col.requiresUser || showUserColumn).map((col) => (
          <TableHead
            key={`mobile-${col.key}`}
            className="md:hidden cursor-pointer"
            onClick={() => requestSort(col.key)}
          >
            {col.label}
            {getIndicator(col.key)}
          </TableHead>
        ))}
        <TableHead className="md:hidden w-[50px]"></TableHead>

        {DESKTOP_COLS.filter((col) => !col.requiresUser || showUserColumn).map((col) => (
          <TableHead
            key={`desktop-${col.key}`}
            className={col.className}
            onClick={() => requestSort(col.key)}
          >
            {col.label}
            {getIndicator(col.key)}
          </TableHead>
        ))}
        <TableHead className="hidden md:table-cell w-[70px]">Akcje</TableHead>
      </TableRow>
    </TableHeader>
  );
}
