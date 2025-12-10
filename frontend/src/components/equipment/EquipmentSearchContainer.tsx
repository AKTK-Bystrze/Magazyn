import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEquipmentSearch } from "@/hooks/use-equipment-search";
import { FilterSidebar } from "./FilterSidebar";
import { EquipmentGrid } from "./EquipmentGrid";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import type {
  EquipmentSearchItem,
  EquipmentType,
  PaginatedResponse,
  PaginationMeta
} from "@/types";

function EquipmentSearchContainer() {
  const { filters, activeFilters, updateFilter } = useEquipmentSearch();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);

  // Fetch Equipment Types for filters
  const { data: typesData } = useQuery({
    queryKey: ["equipment-types"],
    queryFn: () => api.get<EquipmentType[]>("/api/equipment-types"),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const types = Array.isArray(typesData?.data) ? typesData.data : [];

  // Fetch Equipment Results
  const {
    data: equipmentData,
    isLoading,
    error
  } = useQuery({
    queryKey: ["equipment", activeFilters],
    queryFn: () => api.get<{ equipment: EquipmentSearchItem[], pagination: PaginationMeta }>("/api/equipment", activeFilters),
    // Keep previous data while fetching new to prevent flash
    placeholderData: (previousData) => previousData, 
  });


  // Transform backend response to match frontend types
  const equipment = (equipmentData?.data?.equipment || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    typeId: item.type_id,
    type: {
      id: item.type_id,
      name: item.type_name,
      creditCostPerDay: item.credit_cost_per_day,
    },
    status: item.status,
    imagePath: item.image_url,
    internalId: item.internal_id,
    isFavorite: item.is_favorite,
  }));

  const meta = equipmentData?.data?.pagination || {
    page: 1,
    perPage: 25,
    totalItems: 0,
    totalPages: 0
  };

  const handleReset = () => {
    updateFilter("search", "");
    updateFilter("type_id", undefined);
    updateFilter("status", undefined);
    // Page automatically resets to 1 in hook
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-[calc(100vh-4rem)]">
      {/* Mobile Filter Trigger */}
      <div className="lg:hidden flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Equipment</h1>
        <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <FilterSidebar
              filters={filters}
              types={types}
              onFilterChange={updateFilter}
              onReset={handleReset}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 space-y-6">
        <div className="sticky top-6">
          <h2 className="text-xl font-bold mb-4">Filters</h2>
          <FilterSidebar
            filters={filters} 
            types={types} 
            onFilterChange={updateFilter}
            onReset={handleReset}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Results Header (Desktop) */}
        <div className="hidden lg:flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Equipment Inventory</h1>
          <div className="text-sm text-muted-foreground">
            Showing {equipment.length} of {meta.totalItems} items
          </div>
        </div>

        <div className="flex-1">
          <EquipmentGrid
            items={equipment} 
            isLoading={isLoading}
            error={error as Error | null}
          />
        </div>

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => updateFilter("page", meta.page - 1)}
             >
               Previous
             </Button>
             <div className="flex items-center px-4 text-sm font-medium">
              Page {meta.page} of {meta.totalPages}
             </div>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => updateFilter("page", meta.page + 1)}
             >
               Next
             </Button>
           </div>
        )}
      </main>
    </div>
  );
}

export default function EquipmentSearchContainerWithProvider() {
  return (
    <QueryProvider>
      <EquipmentSearchContainer />
    </QueryProvider>
  );
}
