import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
  ICON_SIZE_SM,
  SEARCH_DEBOUNCE_MS,
  MAX_SEARCH_LENGTH,
  EQUIPMENT_STATUS_FILTER_OPTIONS,
  DEFAULT_EQUIPMENT_STATUS_FILTER,
  EQUIPMENT_MANAGER_UI_STRINGS,
} from "@/lib/config/constants";
import type { EquipmentManagerFilterState, EquipmentType } from "@/types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for the EquipmentFilters component
 */
interface EquipmentFiltersProps {
  /** Current filter state */
  filters: EquipmentManagerFilterState;
  /** Available equipment types for filter dropdown */
  equipmentTypes: EquipmentType[];
  /** Callback when any filter changes */
  onFilterChange: <K extends keyof EquipmentManagerFilterState>(
    key: K,
    value: EquipmentManagerFilterState[K]
  ) => void;
  /** Optional callback to reset filters */
  onReset?: () => void;
}

/**
 * Filter bar component for searching and filtering equipment
 * Includes search input with debounce, type dropdown, and status dropdown
 */
export function EquipmentFilters({
  filters,
  equipmentTypes,
  onFilterChange,
  onReset,
}: EquipmentFiltersProps) {
  const [searchValue, setSearchValue] = React.useState(filters.search ?? "");
  const searchInputId = React.useId();

  // Debounced search update
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange("search", searchValue || undefined);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onFilterChange]);

  // Handle search input change
  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.slice(0, MAX_SEARCH_LENGTH);
      setSearchValue(value);
    },
    []
  );

  // Handle type filter change
  const handleTypeChange = React.useCallback(
    (value: string) => {
      onFilterChange("typeId", value === "ALL" ? undefined : value);
    },
    [onFilterChange]
  );

  // Handle status filter change
  const handleStatusChange = React.useCallback(
    (value: string) => {
      onFilterChange("status", value as EquipmentManagerFilterState["status"]);
    },
    [onFilterChange]
  );

  // Handle reset
  const handleReset = React.useCallback(() => {
    setSearchValue("");
    onReset?.();
  }, [onReset]);

  // Check if filters are active
  const hasActiveFilters =
    filters.status !== DEFAULT_EQUIPMENT_STATUS_FILTER ||
    (filters.search && filters.search.length > 0) ||
    filters.typeId !== undefined;

  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${ICON_SIZE_SM}`}
          aria-hidden="true"
        />
        <Input
          id={searchInputId}
          type="search"
          placeholder={UI.SEARCH_PLACEHOLDER}
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-10"
          aria-label="Search equipment"
          maxLength={MAX_SEARCH_LENGTH}
        />
      </div>

      {/* Type Filter */}
      <Select
        value={filters.typeId ?? "ALL"}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger className="w-full sm:w-[180px]" aria-label={UI.FILTER_BY_TYPE}>
          <SelectValue placeholder={UI.ALL_TYPES} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{UI.ALL_TYPES}</SelectItem>
          {equipmentTypes.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status ?? DEFAULT_EQUIPMENT_STATUS_FILTER}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-full sm:w-[160px]" aria-label={UI.FILTER_BY_STATUS}>
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {EQUIPMENT_STATUS_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset Button */}
      {hasActiveFilters && onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="flex items-center gap-1"
          aria-label="Reset filters"
        >
          <X className={ICON_SIZE_SM} />
          <span className="hidden sm:inline">{UI.RESET_FILTERS}</span>
        </Button>
      )}
    </div>
  );
}
