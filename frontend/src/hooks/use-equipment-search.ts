import { useState, useEffect, useCallback } from 'react';
import type { EquipmentSearchParams, EquipmentStatus } from '@/types';

const DEFAULT_PARAMS: EquipmentSearchParams = {
  page: 1,
  limit: 25,
};

export function useEquipmentSearch() {
  const [filters, setFilters] = useState<EquipmentSearchParams>(() => {
    // Only run on client
    if (typeof window === 'undefined') return DEFAULT_PARAMS;
    
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get('q') || undefined,
      type_id: params.get('type_id') || undefined,
      status: (params.get('status') as EquipmentStatus) || undefined,
      page: Number(params.get('page')) || DEFAULT_PARAMS.page,
      limit: Number(params.get('limit')) || DEFAULT_PARAMS.limit,
    };
  });

  const updateUrl = useCallback((newFilters: EquipmentSearchParams) => {
    const params = new URLSearchParams();
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.type_id) params.set('type_id', newFilters.type_id);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit !== DEFAULT_PARAMS.limit) params.set('limit', String(newFilters.limit));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  const updateFilter = useCallback((key: keyof EquipmentSearchParams, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Reset page to 1 on filter change (except when changing page itself)
      if (key !== 'page') {
        newFilters.page = 1;
      }
      updateUrl(newFilters);
      return newFilters;
    });
  }, [updateUrl]);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setFilters({
        q: params.get('q') || undefined,
        type_id: params.get('type_id') || undefined,
        status: (params.get('status') as EquipmentStatus) || undefined,
        page: Number(params.get('page')) || DEFAULT_PARAMS.page,
        limit: Number(params.get('limit')) || DEFAULT_PARAMS.limit,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    filters,
    updateFilter,
  };
}
