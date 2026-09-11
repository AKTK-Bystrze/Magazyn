import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FilterSidebar } from "../FilterSidebar";
import { EQUIPMENT_FILTER_UI_STRINGS } from "@/lib/config/constants";
import type { EquipmentSearchParams, EquipmentType } from "@/types";

const mockTypes: EquipmentType[] = [
  { id: "type-1", name: "Raki", creditCostPerDay: 1, createdAt: "" },
  { id: "type-2", name: "Czekan", creditCostPerDay: 1, createdAt: "" },
];

const defaultFilters: EquipmentSearchParams = {
  page: 1,
  perPage: 25,
};

describe("FilterSidebar", () => {
  const onFilterChange = vi.fn();
  const onReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with default vertical orientation", () => {
    render(
      <FilterSidebar
        filters={defaultFilters}
        types={mockTypes}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />
    );

    expect(
      screen.getByPlaceholderText(EQUIPMENT_FILTER_UI_STRINGS.SEARCH_PLACEHOLDER)
    ).toBeInTheDocument();
    expect(screen.getByText(EQUIPMENT_FILTER_UI_STRINGS.ALL_TYPES)).toBeInTheDocument();
    // In vertical mode, availability uses RadioGroup
    expect(screen.getByLabelText(EQUIPMENT_FILTER_UI_STRINGS.STATUS_ALL)).toBeInTheDocument();
    // DateRangePicker should be visible by default (it renders "Filtruj według dostępności")
    expect(
      screen.getByText(EQUIPMENT_FILTER_UI_STRINGS.FILTER_BY_AVAILABILITY)
    ).toBeInTheDocument();
  });

  it("renders correctly in horizontal orientation and hides dates", () => {
    render(
      <FilterSidebar
        filters={defaultFilters}
        types={mockTypes}
        onFilterChange={onFilterChange}
        onReset={onReset}
        orientation="horizontal"
        showDates={false}
      />
    );

    // In horizontal mode, availability uses a Select instead of RadioGroup
    // Date picker title should not be rendered
    expect(
      screen.queryByText(EQUIPMENT_FILTER_UI_STRINGS.FILTER_BY_AVAILABILITY)
    ).not.toBeInTheDocument();
  });

  it("calls onReset when reset button is clicked", () => {
    render(
      <FilterSidebar
        filters={defaultFilters}
        types={mockTypes}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: EQUIPMENT_FILTER_UI_STRINGS.RESET_FILTERS })
    );
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("calls onFilterChange when search input changes (with debounce)", () => {
    vi.useFakeTimers();

    render(
      <FilterSidebar
        filters={defaultFilters}
        types={mockTypes}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />
    );

    const input = screen.getByPlaceholderText(EQUIPMENT_FILTER_UI_STRINGS.SEARCH_PLACEHOLDER);
    fireEvent.change(input, { target: { value: "raki" } });

    expect(onFilterChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // onFilterChange should be called with "search" and the search value
    expect(onFilterChange).toHaveBeenCalledWith("search", "raki");

    vi.useRealTimers();
  });
});
