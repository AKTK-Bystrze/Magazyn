import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CREDIT_HISTORY_UI_STRINGS, SKELETON_ROW_COUNT } from "@/lib/config/constants";
import type { CreditHistoryItem } from "@/types";
import { format } from "date-fns";

/**
 * Props for CreditHistoryTable component
 */
interface CreditHistoryTableProps {
  /** Array of credit history items to display */
  data: CreditHistoryItem[];
  /** Loading state flag */
  isLoading: boolean;
}

/**
 * Presentational component to display credit history in a table
 */
export function CreditHistoryTable({ data, isLoading }: CreditHistoryTableProps) {
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    const sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  if (isLoading) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">
                {CREDIT_HISTORY_UI_STRINGS.TABLE_DATE}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {CREDIT_HISTORY_UI_STRINGS.TABLE_REASON}
              </TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap">
                {CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {CREDIT_HISTORY_UI_STRINGS.TABLE_AUTHOR}
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                {CREDIT_HISTORY_UI_STRINGS.TABLE_AMOUNT}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div
        className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
        data-testid="credit-history-empty-state"
      >
        {CREDIT_HISTORY_UI_STRINGS.NO_HISTORY}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto">
        <Table data-testid="credit-history-table">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => requestSort('createdAt')}>
                {CREDIT_HISTORY_UI_STRINGS.TABLE_DATE} {sortConfig?.key === 'createdAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => requestSort('reason')}>
                {CREDIT_HISTORY_UI_STRINGS.TABLE_REASON} {sortConfig?.key === 'reason' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap cursor-pointer" onClick={() => requestSort('description')}>
                {CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION} {sortConfig?.key === 'description' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => requestSort('authorUsername')}>
                {CREDIT_HISTORY_UI_STRINGS.TABLE_AUTHOR} {sortConfig?.key === 'authorUsername' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="text-right whitespace-nowrap cursor-pointer" onClick={() => requestSort('amount')}>
                {CREDIT_HISTORY_UI_STRINGS.TABLE_AMOUNT} {sortConfig?.key === 'amount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, index) => (
              <CreditHistoryRow key={item.id} item={item} index={index} />
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

// Helper to get localized reason text and badge variant
const getReasonDisplay = (reason: CreditHistoryItem["reason"]) => {
  switch (reason) {
    case "reservation_charge":
      return {
        text: CREDIT_HISTORY_UI_STRINGS.REASON_RESERVATION_CHARGE,
        variant: "destructive" as const,
      };
    case "reservation_refund":
      return {
        text: CREDIT_HISTORY_UI_STRINGS.REASON_RESERVATION_REFUND,
        variant: "secondary" as const,
      };
    case "reservation_adjustment":
      return {
        text: CREDIT_HISTORY_UI_STRINGS.REASON_RESERVATION_ADJUSTMENT,
        variant: "outline" as const,
      };
    case "admin_adjustment":
      return {
        text: CREDIT_HISTORY_UI_STRINGS.REASON_ADMIN_ADJUSTMENT,
        variant: "default" as const,
      };
    case "work_credit":
      return { text: CREDIT_HISTORY_UI_STRINGS.REASON_WORK_CREDIT, variant: "default" as const };
    default:
      return { text: reason, variant: "outline" as const };
  }
};

function CreditHistoryRow({ item, index }: { item: CreditHistoryItem; index: number }) {
  const { text, variant } = getReasonDisplay(item.reason);
  const isNegative = item.amount < 0;
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <TableRow data-testid={`credit-history-row-${index}`}>
      <TableCell className="whitespace-nowrap">
        {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {item.description ? (
          <Tooltip open={isOpen} onOpenChange={setIsOpen}>
            <TooltipTrigger asChild>
              <div className="cursor-pointer inline-block" onClick={() => setIsOpen(!isOpen)}>
                <Badge variant={variant}>{text}</Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{item.description}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge variant={variant}>{text}</Badge>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell max-w-[200px] sm:max-w-md truncate">
        {item.description || "-"}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {item.authorUsername || "-"}
      </TableCell>
      <TableCell
        className={`text-right font-medium whitespace-nowrap ${isNegative ? "text-destructive" : "text-primary"}`}
      >
        {isNegative ? "" : "+"}
        {item.amount}
      </TableCell>
    </TableRow>
  );
}
