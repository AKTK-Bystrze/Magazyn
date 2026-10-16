import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEquipmentManager } from "../useEquipmentManager";
import { equipmentApi } from "@/lib/api/equipment-api";

vi.mock("@/lib/api/equipment-api", () => ({
  equipmentApi: {
    list: vi.fn(),
    listTypes: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useEquipmentManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();

    vi.mocked(equipmentApi.list).mockResolvedValue({
      equipment: [
        {
          id: "eq-1",
          name: "Test Equipment",
          description: null,
          typeId: "type-1",
          type: { id: "type-1", name: "Czekan", creditCostPerDay: 1 },
          status: "ok",
          imagePath: null,
          internalId: "EQ-001",
        },
      ],
      pagination: {
        page: 1,
        perPage: 25,
        totalItems: 1,
        totalPages: 1,
      },
    });

    vi.mocked(equipmentApi.listTypes).mockResolvedValue([
      { id: "type-1", name: "Czekan", creditCostPerDay: 1, createdAt: "" },
      { id: "type-2", name: "Raki", creditCostPerDay: 1, createdAt: "" },
    ]);
  });

  it("should fetch equipment with default filters", async () => {
    const { result } = renderHook(() => useEquipmentManager(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(equipmentApi.list).toHaveBeenCalledWith({
      page: 1,
      perPage: 25,
      search: undefined,
      typeId: undefined,
      status: undefined,
    });
    expect(result.current.equipment).toHaveLength(1);
  });

  it("should pass typeId to equipmentApi.list when typeId filter is set (Fix #229)", async () => {
    const { result } = renderHook(() => useEquipmentManager(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilter("typeId", "type-2");
    });

    await waitFor(() => {
      expect(equipmentApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: "type-2",
          page: 1,
        })
      );
    });

    expect(result.current.filters.typeId).toBe("type-2");
  });

  it("should reset page to 1 when search filter changes", async () => {
    const { result } = renderHook(() => useEquipmentManager(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilter("page", 3);
    });

    expect(result.current.filters.page).toBe(3);

    act(() => {
      result.current.setFilter("search", "raki");
    });

    expect(result.current.filters.search).toBe("raki");
    expect(result.current.filters.page).toBe(1);

    await waitFor(() => {
      expect(equipmentApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "raki",
          page: 1,
        })
      );
    });
  });

  it("should reset all filters to default when resetFilters is called", async () => {
    const { result } = renderHook(() => useEquipmentManager(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilter("typeId", "type-1");
      result.current.setFilter("search", "query");
    });

    expect(result.current.filters.typeId).toBe("type-1");
    expect(result.current.filters.search).toBe("query");

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.typeId).toBeUndefined();
    expect(result.current.filters.search).toBeUndefined();
    expect(result.current.filters.page).toBe(1);
  });
});
