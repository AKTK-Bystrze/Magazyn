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

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{CREDIT_HISTORY_UI_STRINGS.TABLE_DATE}</TableHead>
              <TableHead>{CREDIT_HISTORY_UI_STRINGS.TABLE_REASON}</TableHead>
              <TableHead>{CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION}</TableHead>
              <TableHead className="text-right">{CREDIT_HISTORY_UI_STRINGS.TABLE_AMOUNT}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{CREDIT_HISTORY_UI_STRINGS.TABLE_DATE}</TableHead>
            <TableHead>{CREDIT_HISTORY_UI_STRINGS.TABLE_REASON}</TableHead>
            <TableHead>{CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION}</TableHead>
            <TableHead className="text-right">{CREDIT_HISTORY_UI_STRINGS.TABLE_AMOUNT}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const { text, variant } = getReasonDisplay(item.reason);
            const isNegative = item.amount < 0;
            
            return (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm")}
                </TableCell>
                <TableCell>
                  <Badge variant={variant}>{text}</Badge>
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {item.description || "-"}
                  {item.adminUsername && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({CREDIT_HISTORY_UI_STRINGS.TABLE_ADMIN}: {item.adminUsername})
                    </span>
                  )}
                </TableCell>
                <TableCell className={`text-right font-medium ${isNegative ? "text-destructive" : "text-primary"}`}>
                  {isNegative ? "" : "+"}{item.amount}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
