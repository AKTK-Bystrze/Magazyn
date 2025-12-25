import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEquipmentSearch } from '../use-equipment-search';

describe('useEquipmentSearch', () => {
  const originalLocation = window.location;
  const mockReplaceState = vi.fn();

  beforeEach(() => {
    // Reset window.location mock
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        search: '',
        pathname: '/equipment',
      },
    });
    
    // Mock history.replaceState
    Object.defineProperty(window, 'history', {
      writable: true,
      value: {
        replaceState: mockReplaceState,
      },
    });
    
    mockReplaceState.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('should initialize with default filters when URL params are empty', () => {
    const { result } = renderHook(() => useEquipmentSearch());
    
    expect(result.current.filters).toEqual({
      page: 1,
      perPage: 25,
      search: undefined,
      typeId: undefined,
      status: undefined,
      availableFrom: undefined,
      availableTo: undefined,
    });
  });

  it('should initialize with filters from URL params', () => {
    window.location.search = '?search=drill&type_id=123&status=ok&page=2';
    const { result } = renderHook(() => useEquipmentSearch());

    expect(result.current.filters).toEqual({
      search: 'drill',
      typeId: '123',
      status: 'ok',
      page: 2,
      perPage: 25,
      availableFrom: undefined,
      availableTo: undefined,
    });
  });

  it('should update specific filter and reset page to 1', () => {
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter('search', 'hammer');
    });

    expect(result.current.filters.search).toBe('hammer');
    expect(result.current.filters.page).toBe(1);
    
    // Check URL update
    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      '',
      '/equipment?search=hammer'
    );
  });

  it('should update page without resetting it', () => {
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter('page', 3);
    });

    expect(result.current.filters.page).toBe(3);
    
    // Check URL update
    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      '',
      '/equipment?page=3'
    );
  });

  it('should debounce activeFilters for search query', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter('search', 'fast typing');
    });

    // Immediate state update
    expect(result.current.filters.search).toBe('fast typing');
    // Active filters (for query) should not have updated yet due to debounce
    expect(result.current.activeFilters.search).toBeUndefined();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now active filters should be updated
    expect(result.current.activeFilters.search).toBe('fast typing');
    
    vi.useRealTimers();
  });

  it('should properly handle status enum values', () => {
    const { result } = renderHook(() => useEquipmentSearch());

    act(() => {
      result.current.updateFilter('status', 'broken');
    });

    expect(result.current.filters.status).toBe('broken');
    expect(mockReplaceState).toHaveBeenCalledWith(
      {},
      '',
      '/equipment?status=broken'
    );
  });
});
