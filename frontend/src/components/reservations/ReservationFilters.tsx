import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import {
  RESERVATION_FILTER_OPTIONS,
  RESERVATION_SORT_OPTIONS,
  ICON_SIZE_SM,
  DEFAULT_STATUS_FILTER,
  DEFAULT_SORT_OPTION,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/config/constants";
import type { ReservationFilterState, ReservationSortOption } from "@/types";
import type { Enums } from "@/db/database.types";
import { useEquipmentTypes } from "@/hooks/use-equipment-api";
import { usersApi } from "@/lib/api/users-api";
import { useQuery } from "@tanstack/react-query";

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
 * Provides string search, user filter, equipment type filter, status filter, sort options, and reset button
 *
 * @param filters - Current filter state
 * @param onFilterChange - Callback when a filter changes
 * @param onReset - Callback to reset all filters
 */
export function ReservationFilters({ filters, onFilterChange, onReset }: ReservationFiltersProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState(filters.search || "");

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: equipmentTypes = [] } = useEquipmentTypes();
  const { data: publicUsersData } = useQuery({
    queryKey: ["users", "public"],
    queryFn: () => usersApi.listPublic({ perPage: 100 }),
    enabled: filters.scope === "all",
    staleTime: 60_000,
  });

  const publicUsers = publicUsersData?.users ?? [];

  const prevFilterSearch = React.useRef(filters.search || "");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (filters.search || "")) {
        prevFilterSearch.current = searchValue;
        onFilterChange("search", searchValue || undefined);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onFilterChange]);

  React.useEffect(() => {
    const current = filters.search || "";
    if (prevFilterSearch.current !== current) {
      prevFilterSearch.current = current;
      setSearchValue(current);
    }
  }, [filters.search]);

  const handleReset = React.useCallback(() => {
    setSearchValue("");
    prevFilterSearch.current = "";
    onReset();
  }, [onReset]);

  const hasActiveFilters =
    filters.status !== DEFAULT_STATUS_FILTER ||
    filters.sort !== DEFAULT_SORT_OPTION ||
    Boolean(searchValue || filters.search) ||
    Boolean(filters.userId) ||
    Boolean(filters.typeId);

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      data-testid="reservation-filters"
      data-hydrated={isMounted ? "true" : undefined}
    >
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Szukaj sprzętu lub użytkownika..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-8 h-9"
          data-testid="reservation-search-input"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="type-filter" className="text-sm font-medium sr-only">
          Typ sprzętu
        </label>
        <Select
          value={filters.typeId || "ALL"}
          onValueChange={(val) => onFilterChange("typeId", val === "ALL" ? undefined : val)}
        >
          <SelectTrigger id="type-filter" className="w-[160px] h-9">
            <SelectValue placeholder="Wszystkie typy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Wszystkie typy</SelectItem>
            {equipmentTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.scope === "all" && (
        <div className="flex items-center gap-2">
          <label htmlFor="user-filter" className="text-sm font-medium sr-only">
            Użytkownik
          </label>
          <Select
            value={filters.userId || "ALL"}
            onValueChange={(val) => onFilterChange("userId", val === "ALL" ? undefined : val)}
          >
            <SelectTrigger id="user-filter" className="w-[170px] h-9">
              <SelectValue placeholder="Wszyscy użytkownicy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Wszyscy użytkownicy</SelectItem>
              {publicUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium sr-only">
          Status
        </label>
        <Select
          value={filters.status}
          onValueChange={(val) =>
            onFilterChange(
              "status",
              val as Enums<"reservation_status"> | typeof DEFAULT_STATUS_FILTER
            )
          }
        >
          <SelectTrigger id="status-filter" className="w-[160px] h-9">
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

      <div className="flex items-center gap-2">
        <label htmlFor="sort-filter" className="text-sm font-medium sr-only">
          Sortuj według
        </label>
        <Select
          value={filters.sort}
          onValueChange={(val) => onFilterChange("sort", val as ReservationSortOption)}
        >
          <SelectTrigger id="sort-filter" className="w-[220px] h-9">
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

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="flex items-center gap-1 h-9"
          data-testid="reset-filters-button"
        >
          <X className={ICON_SIZE_SM} />
          Resetuj
        </Button>
      )}
    </div>
  );
}
