import * as React from "react";
import { type EquipmentSearchParams, type EquipmentType } from "@/types";
import type { DateRangeValidationErrors } from "@/types/reservation-cart.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateRangePicker } from "@/components/reservations/DateRangePicker";
import { ERROR_START_DATE_PAST, ERROR_END_DATE_BEFORE_START } from "@/lib/config/error-messages";
import { EQUIPMENT_FILTER_UI_STRINGS } from "@/lib/config/constants";
import { getTodayAsString } from "@/lib/utils/date-utils";

interface FilterSidebarProps {
  filters: EquipmentSearchParams;
  types: EquipmentType[];
  onFilterChange: (key: keyof EquipmentSearchParams, value: string | undefined) => void;
  onReset: () => void;
}

export function FilterSidebar({ filters, types, onFilterChange, onReset }: FilterSidebarProps) {
  // Validate date range
  const [dateValidationErrors, setDateValidationErrors] = React.useState<DateRangeValidationErrors>({
    startDate: null,
    endDate: null,
  });

  // Validate dates whenever they change
  React.useEffect(() => {
    const errors: DateRangeValidationErrors = {
      startDate: null,
      endDate: null,
    };
    const today = getTodayAsString();

    if (filters.availableFrom) {
      if (filters.availableFrom < today) {
        errors.startDate = ERROR_START_DATE_PAST;
      }
    }

    if (filters.availableFrom && filters.availableTo) {
      if (filters.availableTo < filters.availableFrom) {
        errors.endDate = ERROR_END_DATE_BEFORE_START;
      }
    }

    setDateValidationErrors(errors);
  }, [filters.availableFrom, filters.availableTo]);

  const handleStartDateChange = (date: string) => {
    onFilterChange("availableFrom", date || undefined);
  };

  const handleEndDateChange = (date: string) => {
    onFilterChange("availableTo", date || undefined);
  };

  const handleClearDates = () => {
    onFilterChange("availableFrom", undefined);
    onFilterChange("availableTo", undefined);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder={EQUIPMENT_FILTER_UI_STRINGS.SEARCH_PLACEHOLDER}
          value={filters.search || ""}
          onChange={(e) => onFilterChange("search", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">{EQUIPMENT_FILTER_UI_STRINGS.EQUIPMENT_TYPE_LABEL}</Label>
        <Select
          value={filters.type_id || "all"}
          onValueChange={(val) => onFilterChange("type_id", val === "all" ? undefined : val)}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder={EQUIPMENT_FILTER_UI_STRINGS.ALL_TYPES} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{EQUIPMENT_FILTER_UI_STRINGS.ALL_TYPES}</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{EQUIPMENT_FILTER_UI_STRINGS.AVAILABILITY_LABEL}</Label>
        <RadioGroup
          value={filters.status || "all"}
          onValueChange={(val) => onFilterChange("status", val === "all" ? undefined : val)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="status-all" />
            <Label htmlFor="status-all">{EQUIPMENT_FILTER_UI_STRINGS.STATUS_ALL}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ok" id="status-ok" />
            <Label htmlFor="status-ok">{EQUIPMENT_FILTER_UI_STRINGS.STATUS_AVAILABLE}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="broken" id="status-broken" />
            <Label htmlFor="status-broken">{EQUIPMENT_FILTER_UI_STRINGS.STATUS_BROKEN}</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <DateRangePicker
          startDate={filters.availableFrom || null}
          endDate={filters.availableTo || null}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          validationErrors={dateValidationErrors}
          title={EQUIPMENT_FILTER_UI_STRINGS.FILTER_BY_AVAILABILITY}
          showClearButton={true}
          onClear={handleClearDates}
          compact={true}
        />
      </div>

      <Button variant="outline" className="w-full" onClick={onReset}>
        {EQUIPMENT_FILTER_UI_STRINGS.RESET_FILTERS}
      </Button>
    </div>
  );
}
