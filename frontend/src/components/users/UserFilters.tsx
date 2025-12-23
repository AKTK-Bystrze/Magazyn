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
  USER_ROLE_FILTER_OPTIONS,
  DEFAULT_ROLE_FILTER,
} from "@/lib/config/constants";
import type { UserFilterState } from "@/types";

/**
 * Props for the UserFilters component
 */
interface UserFiltersProps {
  /** Current filter state */
  filters: UserFilterState;
  /** Callback when any filter changes */
  onFilterChange: <K extends keyof UserFilterState>(
    key: K,
    value: UserFilterState[K]
  ) => void;
  /** Optional callback to reset filters */
  onReset?: () => void;
}

/**
 * Filter bar component for searching and filtering users
 * Includes search input with debounce and role dropdown filter
 *
 * @param filters - Current filter state
 * @param onFilterChange - Callback when filter changes
 * @param onReset - Optional callback to reset filters
 */
export function UserFilters({
  filters,
  onFilterChange,
  onReset,
}: UserFiltersProps) {
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

  // Handle role filter change
  const handleRoleChange = React.useCallback(
    (value: string) => {
      onFilterChange("role", value as UserFilterState["role"]);
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
    filters.role !== DEFAULT_ROLE_FILTER || (filters.search && filters.search.length > 0);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${ICON_SIZE_SM}`}
          aria-hidden="true"
        />
        <Input
          id={searchInputId}
          type="search"
          placeholder="Szukaj po nazwie użytkownika lub e-mailu..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-10"
          aria-label="Szukaj użytkowników"
          maxLength={MAX_SEARCH_LENGTH}
          data-testid="admin-search-input"
        />
      </div>

      {/* Role Filter */}
      <Select value={filters.role} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtruj według roli">
          <SelectValue placeholder="Wszystkie Role" />
        </SelectTrigger>
        <SelectContent>
          {USER_ROLE_FILTER_OPTIONS.map((option) => (
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
          aria-label="Resetuj filtry"
        >
          <X className={ICON_SIZE_SM} />
          <span className="hidden sm:inline">Resetuj</span>
        </Button>
      )}
    </div>
  );
}
