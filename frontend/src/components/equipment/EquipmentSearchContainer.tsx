import { useEquipmentSearch } from '@/hooks/use-equipment-search';
import { FilterSidebar } from './FilterSidebar';
import { EquipmentGrid } from './EquipmentGrid';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Equipment, PaginatedResponse, EquipmentType } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const queryClient = new QueryClient();

export function EquipmentSearchContainer() {
  return (
    <QueryClientProvider client={queryClient}>
      <EquipmentSearchContent />
    </QueryClientProvider>
  );
}

function EquipmentSearchContent() {
  const { filters, updateFilter } = useEquipmentSearch();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch Equipment
  const { data: equipmentData, isLoading: isLoadingEquipment, error: equipmentError } = useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => api.get<PaginatedResponse<Equipment>>('/equipment', filters).then(res => res.data),
  });

  // Fetch Types for filters
  const { data: typesData } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: () => api.get<{ data: EquipmentType[] }>('/equipment-types').then(res => res.data),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });


  const equipment = equipmentData?.data || [];
  const meta = equipmentData?.pagination || { page: 1, totalPages: 1 };
  const types = typesData?.data || [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full p-4 md:p-6 max-w-7xl mx-auto">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)} variant="outline">
          {isMobileFilterOpen ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Sidebar - Hidden on mobile unless toggled */}
      <div className={`${isMobileFilterOpen ? 'block' : 'hidden'} lg:block`}>
        <FilterSidebar 
          filters={filters} 
          onFilterChange={updateFilter} 
          types={types}
        />
      </div>

      {/* Main Content */}
      <div className="flex-grow space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
            <div className="text-sm text-muted-foreground">
               {meta.totalItems || 0} items found
            </div>
        </div>

        <EquipmentGrid 
          items={equipment} 
          isLoading={isLoadingEquipment}
          error={equipmentError as Error | null} 
        />
        
        {/* Simple Pagination */}
        {meta.totalPages > 1 && (
           <div className="flex justify-center gap-2 mt-8">
             <Button 
               variant="outline" 
               disabled={filters.page <= 1}
               onClick={() => updateFilter('page', filters.page - 1)}
             >
               Previous
             </Button>
             <div className="flex items-center px-4 text-sm font-medium">
                Page {meta.page} of {meta.totalPages}
             </div>
             <Button 
               variant="outline" 
               disabled={filters.page >= meta.totalPages}
               onClick={() => updateFilter('page', filters.page + 1)}
             >
               Next
             </Button>
           </div>
        )}
      </div>
    </div>
  );
}
