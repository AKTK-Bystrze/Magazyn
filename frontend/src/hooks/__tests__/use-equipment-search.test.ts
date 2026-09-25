import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEquipmentSearch } from "../use-equipment-search";

vi.mock("@/lib/utils/date-utils", () => ({
  getTodayAsString: () => "2024-01-01",
}));

describe("useEquipmentSearch", () => {
  const originalLocation = window.location;
  const mockReplaceState = vi.fn();

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...originalLocation,
        search: "",
        pathname: "/equipment",
      },
    });

    Object.defineProperty(window, "history", {
      writable: true,
      value: {
        replaceState: mockReplaceState,
      },
    });

    mockReplaceState.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("should initialize with default filters when URL params are empty", () => {
    const { result } = renderHook(() => useEquipmentSearch());

    expect(result.current.filters).toEqual({
      page: 1,
      perPage: 25,
      search: undefined,
      typeId: undefined,
      status: undefined,
      availableFrom: "2024-01-01",
      availableTo: "2024-01-01",
    });
  });

  it("should initialize with filters from URL params", () => {
    window.location.search = "?search=drill&type_id=123&status=ok&page=2";
    const { result } = renderHook(() => useEquipmentSearch());

    expect(result.current.filters).toEqual({
      search: "drill",
      typeId: "123",
      status: "ok",
      page: 2,
      perPage: 25,
      availableFrom: "2024-01-01",
      availableTo: "2024-01-01",
    });
  });

  it("should update specific filter and reset page to 1", () => {
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter("search", "hammer");
    });

    expect(result.current.filters.search).toBe("hammer");
    expect(result.current.filters.page).toBe(1);

    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      "",
      "/equipment?search=hammer&available_from=2024-01-01&available_to=2024-01-01"
    );
  });

  it("should update page without resetting it", () => {
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter("page", 3);
    });

    expect(result.current.filters.page).toBe(3);

    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      "",
      "/equipment?page=3&available_from=2024-01-01&available_to=2024-01-01"
    );
  });

  it("should debounce activeFilters for search query", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter("search", "fast typing");
    });

    expect(result.current.filters.search).toBe("fast typing");
    expect(result.current.activeFilters.search).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.activeFilters.search).toBe("fast typing");

    vi.useRealTimers();
  });

  it("should properly handle status enum values", () => {
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter("status", "broken");
    });

    expect(result.current.filters.status).toBe("broken");
    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      "",
      "/equipment?status=broken&available_from=2024-01-01&available_to=2024-01-01"
    );
  });
});
