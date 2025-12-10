import * as React from "react";
import { type EquipmentSearchParams, type EquipmentType } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FilterSidebarProps {
  filters: EquipmentSearchParams;
  types: EquipmentType[];
  onFilterChange: (key: keyof EquipmentSearchParams, value: any) => void;
  onReset: () => void;
}

export function FilterSidebar({ filters, types, onFilterChange, onReset }: FilterSidebarProps) {
  // Local state for debounced search could be handled here or in parent
  // Assuming parent handles direct changes for now based on props

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Search by name..."
          value={filters.search || ""}
          onChange={(e) => onFilterChange("search", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Equipment Type</Label>
        <Select
          value={filters.type_id || "all"}
          onValueChange={(val) => onFilterChange("type_id", val === "all" ? undefined : val)}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Availability</Label>
        <RadioGroup
          value={filters.status || "all"}
          onValueChange={(val) => onFilterChange("status", val === "all" ? undefined : val)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="status-all" />
            <Label htmlFor="status-all">All</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ok" id="status-ok" />
            <Label htmlFor="status-ok">Available</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="broken" id="status-broken" />
            <Label htmlFor="status-broken">Broken/Unavailable</Label>
          </div>
        </RadioGroup>
      </div>

      <Button variant="outline" className="w-full" onClick={onReset}>
        Reset Filters
      </Button>
    </div>
  );
}
