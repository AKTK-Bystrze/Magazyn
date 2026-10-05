import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useTableSort } from "../useTableSort";

interface SampleItem {
  id: string;
  name: string;
  count: number;
  category?: string | null;
}

const sampleItems: SampleItem[] = [
  { id: "1", name: "Zebra", count: 10, category: "Mammal" },
  { id: "2", name: "Apple", count: 50, category: null },
  { id: "3", name: "Banana", count: 20, category: "Fruit" },
];

describe("useTableSort", () => {
  it("should initialize with unsorted data when no initialKey is given", () => {
    const { result } = renderHook(() => useTableSort(sampleItems));

    expect(result.current.sortConfig).toBeNull();
    expect(result.current.sortedData).toEqual(sampleItems);
  });

  it("should sort ascending on first requestSort", () => {
    const { result } = renderHook(() => useTableSort(sampleItems));

    act(() => {
      result.current.requestSort("name");
    });

    expect(result.current.sortConfig).toEqual({ key: "name", direction: "asc" });
    expect(result.current.sortedData.map((i) => i.name)).toEqual(["Apple", "Banana", "Zebra"]);
  });

  it("should toggle to descending on second requestSort for same key", () => {
    const { result } = renderHook(() => useTableSort(sampleItems));

    act(() => {
      result.current.requestSort("count");
    });
    expect(result.current.sortedData.map((i) => i.count)).toEqual([10, 20, 50]);

    act(() => {
      result.current.requestSort("count");
    });
    expect(result.current.sortConfig).toEqual({ key: "count", direction: "desc" });
    expect(result.current.sortedData.map((i) => i.count)).toEqual([50, 20, 10]);
  });

  it("should sort null and undefined values safely", () => {
    const { result } = renderHook(() => useTableSort(sampleItems));

    act(() => {
      result.current.requestSort("category");
    });

    expect(result.current.sortConfig).toEqual({ key: "category", direction: "asc" });
    expect(result.current.sortedData[0].category).toBe("Fruit");
    expect(result.current.sortedData[1].category).toBe("Mammal");
    expect(result.current.sortedData[2].category).toBeNull();
  });

  it("should support custom getValue accessor", () => {
    const nestedItems = [
      { id: "1", meta: { rank: 3 } },
      { id: "2", meta: { rank: 1 } },
      { id: "3", meta: { rank: 2 } },
    ];

    const { result } = renderHook(() =>
      useTableSort(nestedItems, {
        getValue: (item, key) => (key === "rank" ? item.meta.rank : undefined),
      })
    );

    act(() => {
      result.current.requestSort("rank");
    });

    expect(result.current.sortedData.map((i) => i.meta.rank)).toEqual([1, 2, 3]);
  });
});
