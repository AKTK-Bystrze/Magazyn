import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Eye, Archive } from "lucide-react";
import {
  ICON_SIZE_SM,
  SKELETON_ROW_COUNT,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_MANAGER_UI_STRINGS,
} from "@/lib/config/constants";
import type { EquipmentSearchItem } from "@/types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for the EquipmentTable component
 */
interface EquipmentTableProps {
  /** List of equipment items to display */
  equipment: EquipmentSearchItem[];
  /** Loading state */
  isLoading: boolean;
  /** Callback when edit action is clicked */
  onEdit: (item: EquipmentSearchItem) => void;
  /** Callback when view details action is clicked */
  onViewDetails: (item: EquipmentSearchItem) => void;
  /** Callback when archive action is clicked */
  onArchive: (item: EquipmentSearchItem) => void;
}

/**
 * Returns badge variant based on equipment status
 */
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ok":
      return "default";
    case "broken":
      return "destructive";
    case "blocked":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Loading skeleton row component
 */
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-16" />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Skeleton className="h-4 w-12" />
      </TableCell>
      <TableCell className="hidden xl:table-cell">
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8" />
      </TableCell>
    </TableRow>
  );
}

/**
 * Empty state component when no equipment is found
 */
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-24 text-center">
        <div className="text-muted-foreground">
          <p className="font-medium">{UI.NO_EQUIPMENT}</p>
          <p className="text-sm">{UI.NO_EQUIPMENT_HINT}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Data table displaying equipment list with columns for ID, name, type, status, cost, created date, and actions
 * Uses Shadcn Table components
 */
export function EquipmentTable({
  equipment,
  isLoading,
  onEdit,
  onViewDetails,
  onArchive,
}: EquipmentTableProps) {
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedEquipment = React.useMemo(() => {
    const sortableItems = [...equipment];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'type.name') {
          aValue = a.type?.name;
          bValue = b.type?.name;
        } else if (sortConfig.key === 'type.creditCostPerDay') {
          aValue = a.type?.creditCostPerDay;
          bValue = b.type?.creditCostPerDay;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [equipment, sortConfig]);

  // Create action handlers with item bound
  const handleEdit = React.useCallback(
    (item: EquipmentSearchItem) => () => {
      onEdit(item);
    },
    [onEdit]
  );

  const handleViewDetails = React.useCallback(
    (item: EquipmentSearchItem) => () => {
      onViewDetails(item);
    },
    [onViewDetails]
  );

  const handleArchive = React.useCallback(
    (item: EquipmentSearchItem) => () => {
      onArchive(item);
    },
    [onArchive]
  );

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table data-testid="admin-equipment-table">
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => requestSort('internalId')}>{UI.INTERNAL_ID} {sortConfig?.key === 'internalId' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</TableHead>
            <TableHead className="cursor-pointer" onClick={() => requestSort('name')}>{UI.NAME} {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</TableHead>
            <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => requestSort('type.name')}>{UI.TYPE} {sortConfig?.key === 'type.name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</TableHead>
            <TableHead className="cursor-pointer" onClick={() => requestSort('status')}>{UI.STATUS} {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</TableHead>
            <TableHead className="hidden lg:table-cell text-right cursor-pointer" onClick={() => requestSort('type.creditCostPerDay')}>{UI.CREDIT_COST} {sortConfig?.key === 'type.creditCostPerDay' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</TableHead>
            <TableHead className="hidden xl:table-cell">{UI.CREATED}</TableHead>
            <TableHead className="w-[70px]">{UI.ACTIONS}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <SkeletonRow key={`skeleton-${index}`} />
            ))
          ) : sortedEquipment.length === 0 ? (
            <EmptyState />
          ) : (
            // Equipment rows
            sortedEquipment.map((item) => (
              <TableRow
                key={item.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={handleViewDetails(item)}
                data-testid={`equipment-row-${item.id}`}
              >
                <TableCell>
                  <div className="font-mono text-sm font-medium">{item.internalId}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {item.name || (
                      <span className="text-muted-foreground italic">{item.type.name}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground md:hidden">{item.type.name}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{item.type.name}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(item.status)}>
                    {EQUIPMENT_STATUS_LABELS[item.status] || item.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums">
                  {item.type.creditCostPerDay}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-muted-foreground">
                  {/* TODO: Add createdAt to EquipmentSearchItem type if needed */}—
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Actions for ${item.internalId}`}
                        data-testid={`equipment-actions-menu-${item.id}`}
                      >
                        <MoreHorizontal className={ICON_SIZE_SM} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={handleViewDetails(item)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`equipment-view-details-btn-${item.id}`}
                      >
                        <Eye className={ICON_SIZE_SM + " mr-2"} />
                        {UI.VIEW_DETAILS}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={handleEdit(item)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`equipment-edit-btn-${item.id}`}
                      >
                        <Pencil className={ICON_SIZE_SM + " mr-2"} />
                        {UI.EDIT_EQUIPMENT}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={handleArchive(item)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-destructive focus:text-destructive"
                        data-testid={`equipment-archive-btn-${item.id}`}
                      >
                        <Archive className={ICON_SIZE_SM + " mr-2"} />
                        {UI.ARCHIVE_EQUIPMENT}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
