import * as React from "react";
import type { DateRangeValidationErrors } from "@/types/reservation-cart.types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { calculateDays, getTodayAsString } from "@/lib/utils/date-utils";
import { pluralize } from "@/lib/utils/text-utils";
import {
  ICON_SIZE_SM,
  EQUIPMENT_FILTER_UI_STRINGS,
  ERROR_SELECT_DATES,
} from "@/lib/config/constants";

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  validationErrors: DateRangeValidationErrors;
  /** Optional: Custom title, defaults to "Reservation Dates", set null to hide */
  title?: string | null;
  /** Optional: Show clear button for filter use cases */
  showClearButton?: boolean;
  /** Optional: Callback when clear button clicked */
  onClear?: () => void;
  /** Optional: Compact mode for sidebar filters */
  compact?: boolean;
  /** Optional: Allow selecting past dates (for modifying existing reservations) */
  allowPastDates?: boolean;
}

/**
 * Date range picker component for reservation dates
 * Handles start and end date selection with validation
 * Can be used in compact mode for filtering scenarios
 */
export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  validationErrors,
  title = "Daty Rezerwacji",
  showClearButton = false,
  onClear,
  compact = false,
  allowPastDates = false,
}: DateRangePickerProps) {
  const startDateId = React.useId();
  const endDateId = React.useId();
  const today = getTodayAsString();
  const days =
    startDate && endDate ? calculateDays(startDate, endDate) : null;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"} data-testid="date-range-picker">
      {title && (
        <div className="flex items-center justify-between">
          <h2 className={compact ? "text-lg font-semibold" : "text-2xl font-bold"}>{title}</h2>
          {showClearButton && (startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 px-2 text-xs"
            >
              {EQUIPMENT_FILTER_UI_STRINGS.CLEAR_DATES}
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={startDateId} className="flex items-center gap-2">
            <CalendarIcon className={ICON_SIZE_SM} />
            Data Rozpoczęcia
          </Label>
          <Input
            id={startDateId}
            type="date"
            value={startDate || ""}
            onChange={(e) => onStartDateChange(e.target.value)}
            min={allowPastDates ? undefined : today}
            aria-invalid={!!validationErrors.startDate}
            aria-describedby={validationErrors.startDate ? `${startDateId}-error` : undefined}
            className={
              validationErrors.startDate
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
            data-testid="start-date-input"
          />
          {validationErrors.startDate && (
            <p id={`${startDateId}-error`} className="text-sm text-destructive">
              {validationErrors.startDate}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={endDateId} className="flex items-center gap-2">
            <CalendarIcon className={ICON_SIZE_SM} />
            Data Zakończenia
          </Label>
          <Input
            id={endDateId}
            type="date"
            value={endDate || ""}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate || today}
            aria-invalid={!!validationErrors.endDate}
            aria-describedby={validationErrors.endDate ? `${endDateId}-error` : undefined}
            className={
              validationErrors.endDate
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
            data-testid="end-date-input"
          />
          {validationErrors.endDate && (
            <p id={`${endDateId}-error`} className="text-sm text-destructive">
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
              Czas trwania rezerwacji: {days} {days === 1 ? "dzień" : "dni"}
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
