import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReservationFilters } from "../ReservationFilters";
import type { ReservationFilterState } from "@/types";

vi.mock("@/hooks/use-equipment-api", () => ({
  useEquipmentTypes: () => ({
    data: [
      { id: "type-1", name: "Kajaki" },
      { id: "type-2", name: "Wiosła" },
    ],
  }),
}));

vi.mock("@/lib/api/users-api", () => ({
  usersApi: {
    listPublic: vi.fn().mockResolvedValue({
      users: [
        { id: "user-1", username: "mateusz" },
        { id: "user-2", username: "jan" },
      ],
      pagination: { page: 1, perPage: 100, totalItems: 2, totalPages: 1 },
    }),
  },
}));

describe("ReservationFilters", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const defaultFilters: ReservationFilterState = {
    page: 1,
    perPage: 25,
    status: "ALL",
    sort: "created_desc",
    scope: "my",
  };

  const onFilterChange = vi.fn();
  const onReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  const renderComponent = (filters: ReservationFilterState = defaultFilters) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReservationFilters filters={filters} onFilterChange={onFilterChange} onReset={onReset} />
      </QueryClientProvider>
    );
  };

  it("renders search input, type filter, status filter, and sort filter", () => {
    renderComponent();

    expect(screen.getByPlaceholderText("Szukaj sprzętu lub użytkownika...")).toBeInTheDocument();
    expect(screen.getByText("Wszystkie typy")).toBeInTheDocument();
    expect(screen.getByText("Wszystkie statusy")).toBeInTheDocument();
    expect(screen.getByText("Data utworzenia: najnowsze")).toBeInTheDocument();
  });

  it("shows user filter when scope is 'all'", () => {
    renderComponent({ ...defaultFilters, scope: "all" });
    expect(screen.getByText("Wszyscy użytkownicy")).toBeInTheDocument();
  });

  it("does not show user filter when scope is 'my'", () => {
    renderComponent({ ...defaultFilters, scope: "my" });
    expect(screen.queryByText("Wszyscy użytkownicy")).not.toBeInTheDocument();
  });

  it("triggers onFilterChange with debounced search input", () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText("Szukaj sprzętu lub użytkownika...");
    fireEvent.change(searchInput, { target: { value: "kajak" } });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onFilterChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onFilterChange).toHaveBeenCalledWith("search", "kajak");
  });

  it("shows reset button when active filters exist and triggers onReset", () => {
    renderComponent({ ...defaultFilters, status: "PENDING" });

    const resetButton = screen.getByRole("button", { name: /resetuj/i });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalled();
  });
});
