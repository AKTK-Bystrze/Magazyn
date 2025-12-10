import { useState, useEffect, useCallback, useMemo } from 'react';
import type { EquipmentSearchParams, EquipmentStatus } from '@/types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '@/lib/config/constants';

export function useEquipmentSearch() {
  // Initialize state from URL on mount
  const [filters, setFilters] = useState<EquipmentSearchParams>(() => {
    if (typeof window === 'undefined') {
      return { page: DEFAULT_PAGE, perPage: DEFAULT_PAGE_SIZE };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get('search') || undefined,
      type_id: params.get('type_id') || undefined,
      status: (params.get('status') as EquipmentStatus) || undefined,
      page: Number(params.get('page')) || DEFAULT_PAGE,
      perPage: Number(params.get('per_page')) || DEFAULT_PAGE_SIZE,
    };
  });

  // Function to sync state to URL
  const updateUrl = useCallback((newFilters: EquipmentSearchParams) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.type_id) params.set('type_id', newFilters.type_id);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.page > 1) params.set('page', String(newFilters.page));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, []);

  // Update filter handler
  const updateFilter = useCallback((key: keyof EquipmentSearchParams, value: any) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };

      // Reset page to 1 if filter changes (except specific page change)
      if (key !== 'page') {
        newFilters.page = 1;
      }

      updateUrl(newFilters);
      return newFilters;
    });
  }, [updateUrl]);

  // Specific handler for debounced search
  // The UI updates local input immediately, but we might want to delay the URL/Fetch update
  // For simplicity in this hook we just expose a direct update. 
  // Debouncing can be handled in the component or via a separate simpler hook if needed.
  // Given the requirement: "Translating... Typing in Search: Updates local state immediately, updates URL/fetches after 300ms debounce"
  // We will add a debounced version of the filters for the query.

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      updateUrl(filters); // Sync URL when debounce settles
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filters, updateUrl]);

  return {
    filters, // For input binding
    activeFilters: debouncedFilters, // For API query
    updateFilter,
  };
}
