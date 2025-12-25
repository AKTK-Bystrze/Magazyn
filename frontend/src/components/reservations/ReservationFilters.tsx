import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  RESERVATION_FILTER_OPTIONS,
  RESERVATION_SORT_OPTIONS,
  ICON_SIZE_SM,
  DEFAULT_STATUS_FILTER,
  DEFAULT_SORT_OPTION,
} from "@/lib/config/constants";
import type { ReservationFilterState, ReservationSortOption } from "@/types";
import type { Enums } from "@/db/database.types";

/**
 * Props for the ReservationFilters component
 */
interface ReservationFiltersProps {
  filters: ReservationFilterState;
  onFilterChange: <K extends keyof ReservationFilterState>(
    key: K,
    value: ReservationFilterState[K]
  ) => void;
  onReset: () => void;
}

/**
 * Filter toolbar for reservation list
 * Provides status filter, sort options, and reset button
 *
 * @param filters - Current filter state
 * @param onFilterChange - Callback when a filter changes
 * @param onReset - Callback to reset all filters
 */
export function ReservationFilters({
  filters,
  onFilterChange,
  onReset,
}: ReservationFiltersProps) {
  const hasActiveFilters =
    filters.status !== DEFAULT_STATUS_FILTER ||
    filters.sort !== DEFAULT_SORT_OPTION;

  const handleStatusChange = React.useCallback(
    (value: string) => {
      onFilterChange(
        "status",
        value as Enums<"reservation_status"> | typeof DEFAULT_STATUS_FILTER
      );
    },
    [onFilterChange]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      onFilterChange("sort", value as ReservationSortOption);
    },
    [onFilterChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium sr-only">
          Status
        </label>
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger id="status-filter" className="w-[160px]">
            <SelectValue placeholder="Filtruj według statusu" />
          </SelectTrigger>
          <SelectContent>
            {RESERVATION_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-filter" className="text-sm font-medium sr-only">
          Sortuj według
        </label>
        <Select value={filters.sort} onValueChange={handleSortChange}>
          <SelectTrigger id="sort-filter" className="w-[180px]">
            <SelectValue placeholder="Sortuj według" />
          </SelectTrigger>
          <SelectContent>
            {RESERVATION_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="flex items-center gap-1"
        >
          <X className={ICON_SIZE_SM} />
          Resetuj
        </Button>
      )}
    </div>
  );
}
