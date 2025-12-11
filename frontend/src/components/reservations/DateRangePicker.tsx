import * as React from "react";
import type { DateRangeValidationErrors } from "@/types/reservation-cart.types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Calendar as CalendarIcon } from "lucide-react";
import { calculateDays, getTodayAsString } from "@/lib/utils/date-utils";
import { pluralize } from "@/lib/utils/text-utils";
import { ICON_SIZE_SM } from "@/lib/config/constants";
import { ERROR_SELECT_DATES } from "@/lib/config/error-messages";

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  validationErrors: DateRangeValidationErrors;
}

/**
 * Date range picker component for reservation dates
 * Handles start and end date selection with validation
 */
export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  validationErrors,
}: DateRangePickerProps) {
  const today = getTodayAsString();
  const days =
    startDate && endDate ? calculateDays(startDate, endDate) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reservation Dates</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="flex items-center gap-2">
            <CalendarIcon className={ICON_SIZE_SM} />
            Start Date
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate || ""}
            onChange={(e) => onStartDateChange(e.target.value)}
            min={today}
            className={
              validationErrors.startDate
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {validationErrors.startDate && (
            <p className="text-sm text-destructive">
              {validationErrors.startDate}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date" className="flex items-center gap-2">
            <CalendarIcon className={ICON_SIZE_SM} />
            End Date
          </Label>
          <Input
            id="end-date"
            type="date"
            value={endDate || ""}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate || today}
            className={
              validationErrors.endDate
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {validationErrors.endDate && (
            <p className="text-sm text-destructive">
              {validationErrors.endDate}
            </p>
          )}
        </div>
      </div>

      {days !== null && days > 0 && (
        <Alert className="bg-muted">
          <div className="flex items-center gap-2">
            <CalendarIcon className={ICON_SIZE_SM} />
            <p className="text-sm font-medium">
              Reservation duration: {days} {pluralize(days, "day")}
            </p>
          </div>
        </Alert>
      )}

      {!startDate || !endDate ? (
        <p className="text-sm text-muted-foreground">
          {ERROR_SELECT_DATES}
        </p>
      ) : null}
    </div>
  );
}
