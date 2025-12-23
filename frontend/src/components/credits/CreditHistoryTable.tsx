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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  if (isLoading) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_DATE}</TableHead>
              <TableHead className="whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_REASON}</TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION}</TableHead>
              <TableHead className="whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_AUTHOR}</TableHead>
              <TableHead className="text-right whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_AMOUNT}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        {CREDIT_HISTORY_UI_STRINGS.NO_HISTORY}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_DATE}</TableHead>
              <TableHead className="whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_REASON}</TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION}</TableHead>
              <TableHead className="whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_AUTHOR}</TableHead>
              <TableHead className="text-right whitespace-nowrap">{CREDIT_HISTORY_UI_STRINGS.TABLE_AMOUNT}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <CreditHistoryRow key={item.id} item={item} />
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
      return { text: CREDIT_HISTORY_UI_STRINGS.REASON_RESERVATION_CHARGE, variant: "destructive" as const };
    case "reservation_refund":
      return { text: CREDIT_HISTORY_UI_STRINGS.REASON_RESERVATION_REFUND, variant: "secondary" as const };
    case "reservation_adjustment":
      return { text: CREDIT_HISTORY_UI_STRINGS.REASON_RESERVATION_ADJUSTMENT, variant: "outline" as const };
    case "admin_adjustment":
      return { text: CREDIT_HISTORY_UI_STRINGS.REASON_ADMIN_ADJUSTMENT, variant: "default" as const };
    case "work_credit":
      return { text: CREDIT_HISTORY_UI_STRINGS.REASON_WORK_CREDIT, variant: "default" as const };
    default:
      return { text: reason, variant: "outline" as const };
  }
};

function CreditHistoryRow({ item }: { item: CreditHistoryItem }) {
  const { text, variant } = getReasonDisplay(item.reason);
  const isNegative = item.amount < 0;
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm")}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {item.description ? (
          <Tooltip open={isOpen} onOpenChange={setIsOpen}>
            <TooltipTrigger asChild>
              <div
                className="cursor-pointer inline-block"
                onClick={() => setIsOpen(!isOpen)}
              >
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
      <TableCell className={`text-right font-medium whitespace-nowrap ${isNegative ? "text-destructive" : "text-primary"}`}>
        {isNegative ? "" : "+"}{item.amount}
      </TableCell>
    </TableRow>
  );
}
