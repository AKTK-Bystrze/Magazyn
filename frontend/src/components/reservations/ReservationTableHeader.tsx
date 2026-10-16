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

/**
 * Header row for reservation table with responsive desktop and mobile columns and sort indicators.
 */
export function ReservationTableHeader({
  showUserColumn,
  sortConfig,
  requestSort,
}: ReservationTableHeaderProps) {
  const renderSortIndicator = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  return (
    <TableHeader>
      <TableRow>
        {showUserColumn && (
          <TableHead className="md:hidden cursor-pointer" onClick={() => requestSort("username")}>
            Użytkownik{renderSortIndicator("username")}
          </TableHead>
        )}
        <TableHead className="md:hidden cursor-pointer" onClick={() => requestSort("dates")}>
          Daty{renderSortIndicator("dates")}
        </TableHead>
        <TableHead
          className="md:hidden cursor-pointer"
          onClick={() => requestSort("equipmentName")}
        >
          Sprzęt{renderSortIndicator("equipmentName")}
        </TableHead>
        <TableHead className="md:hidden cursor-pointer" onClick={() => requestSort("status")}>
          Status{renderSortIndicator("status")}
        </TableHead>
        <TableHead className="md:hidden w-[50px]"></TableHead>

        <TableHead
          className="hidden md:table-cell cursor-pointer"
          onClick={() => requestSort("equipmentName")}
        >
          Sprzęt{renderSortIndicator("equipmentName")}
        </TableHead>
        <TableHead
          className="hidden md:table-cell cursor-pointer"
          onClick={() => requestSort("equipmentType")}
        >
          Typ{renderSortIndicator("equipmentType")}
        </TableHead>
        <TableHead
          className="hidden md:table-cell cursor-pointer"
          onClick={() => requestSort("status")}
        >
          Status{renderSortIndicator("status")}
        </TableHead>
        <TableHead
          className="hidden md:table-cell cursor-pointer"
          onClick={() => requestSort("startDate")}
        >
          Od{renderSortIndicator("startDate")}
        </TableHead>
        <TableHead
          className="hidden md:table-cell cursor-pointer"
          onClick={() => requestSort("endDate")}
        >
          Do{renderSortIndicator("endDate")}
        </TableHead>
        <TableHead
          className="hidden md:table-cell text-right cursor-pointer"
          onClick={() => requestSort("creditCost")}
        >
          Koszt{renderSortIndicator("creditCost")}
        </TableHead>
        {showUserColumn && (
          <TableHead
            className="hidden xl:table-cell cursor-pointer"
            onClick={() => requestSort("username")}
          >
            Użytkownik{renderSortIndicator("username")}
          </TableHead>
        )}
        <TableHead className="hidden md:table-cell w-[70px]">Akcje</TableHead>
      </TableRow>
    </TableHeader>
  );
}
