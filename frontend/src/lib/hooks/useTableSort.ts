import * as React from "react";

/**
 * Direction for table column sorting.
 */
export type SortDirection = "asc" | "desc";

/**
 * Configuration representing current table sort state.
 */
export interface SortConfig<K extends string = string> {
  key: K;
  direction: SortDirection;
}

/**
 * Options for configuring the `useTableSort` hook.
 */
export interface UseTableSortOptions<T, K extends string = string> {
  /** Initial column key to sort by */
  initialKey?: K | null;
  /** Initial sorting direction (defaults to "asc") */
  initialDirection?: SortDirection;
  /** Custom accessor function to extract sortable values from an item */
  getValue?: (item: T, key: K) => unknown;
}

/**
 * Custom React hook for managing table sorting state and comparator execution.
 * Eliminates repetitive sorting boilerplate and enforces null-safe, strongly-typed comparators.
 *
 * @template T - Type of the items in the table
 * @template K - String union of allowed sort keys
 * @param items - The raw array of items to sort
 * @param options - Optional configuration including initial sort and custom value accessor
 * @returns Object containing `sortConfig`, `requestSort`, `setSortConfig`, and `sortedData`
 *
 * @example
 * ```tsx
 * const { sortConfig, requestSort, sortedData } = useTableSort(users, {
 *   getValue: (item, key) => item[key as keyof UserListItem],
 * });
 * ```
 */
export function useTableSort<T, K extends string = string>(
  items: T[],
  options?: UseTableSortOptions<T, K>
) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig<K> | null>(() =>
    options?.initialKey
      ? {
          key: options.initialKey,
          direction: options.initialDirection ?? "asc",
        }
      : null
  );

  const requestSort = React.useCallback((key: K) => {
    setSortConfig((prev) => {
      let direction: SortDirection = "asc";
      if (prev && prev.key === key && prev.direction === "asc") {
        direction = "desc";
      }
      return { key, direction };
    });
  }, []);

  const getValue = options?.getValue;

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return items;

    const sortableItems = [...items];
    const { key, direction } = sortConfig;

    sortableItems.sort((a: T, b: T) => {
      const aVal: unknown = getValue ? getValue(a, key) : (a as Record<string, unknown>)[key];
      const bVal: unknown = getValue ? getValue(b, key) : (b as Record<string, unknown>)[key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return direction === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      if (aVal < bVal) {
        return direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sortableItems;
  }, [items, sortConfig, getValue]);

  return {
    sortConfig,
    setSortConfig,
    requestSort,
    sortedData,
  };
}
