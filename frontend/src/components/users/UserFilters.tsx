import * as React from "react";
import { SearchInput } from "@/components/ui/search-input";
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
  ICON_SIZE_SM,
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
  onFilterChange: <K extends keyof UserFilterState>(key: K, value: UserFilterState[K]) => void;
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
export function UserFilters({ filters, onFilterChange, onReset }: UserFiltersProps) {
  const handleRoleChange = React.useCallback(
    (value: string) => {
      onFilterChange("role", value as UserFilterState["role"]);
    },
    [onFilterChange]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      onFilterChange("search", value || undefined);
    },
    [onFilterChange]
  );

  const hasActiveFilters =
    filters.role !== DEFAULT_ROLE_FILTER || (filters.search && filters.search.length > 0);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <SearchInput
        placeholder="Szukaj po nazwie użytkownika lub e-mailu..."
        value={filters.search ?? ""}
        onSearchChange={handleSearchChange}
        aria-label="Szukaj użytkowników"
        maxLength={MAX_SEARCH_LENGTH}
        data-testid="admin-search-input"
        containerClassName="flex-1 max-w-md"
      />

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

      {hasActiveFilters && onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
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
