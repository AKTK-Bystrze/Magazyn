import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserFilters } from "../UserFilters";
import { DEFAULT_ROLE_FILTER } from "@/lib/config/constants";
import type { UserFilterState } from "@/types";

const defaultFilters: UserFilterState = {
  page: 1,
  perPage: 25,
  role: DEFAULT_ROLE_FILTER as UserFilterState["role"],
};

describe("UserFilters", () => {
  const onFilterChange = vi.fn();
  const onReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input and role select with default values", () => {
    render(
      <UserFilters filters={defaultFilters} onFilterChange={onFilterChange} onReset={onReset} />
    );

    expect(
      screen.getByPlaceholderText("Szukaj po nazwie użytkownika lub e-mailu...")
    ).toBeInTheDocument();
    expect(screen.getByText("Wszystkie role")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resetuj filtry" })).not.toBeInTheDocument();
  });

  it("calls onFilterChange when search changes (with debounce)", () => {
    render(
      <UserFilters filters={defaultFilters} onFilterChange={onFilterChange} onReset={onReset} />
    );

    const input = screen.getByPlaceholderText("Szukaj po nazwie użytkownika lub e-mailu...");
    fireEvent.change(input, { target: { value: "john" } });

    expect(onFilterChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onFilterChange).toHaveBeenCalledWith("search", "john");
  });

  it("displays reset button when search filter is active and calls onReset on click", () => {
    render(
      <UserFilters
        filters={{ ...defaultFilters, search: "john" }}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />
    );

    const resetButton = screen.getByRole("button", { name: "Resetuj filtry" });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
