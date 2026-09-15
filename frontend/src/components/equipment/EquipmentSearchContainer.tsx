import * as React from "react";
import { useEquipmentSearch } from "@/hooks/use-equipment-search";
import { useInfiniteEquipmentList, useEquipmentTypes } from "@/hooks/use-equipment-api";
import { FilterSidebar } from "./FilterSidebar";
import { EquipmentGrid } from "./EquipmentGrid";
import { EquipmentDetailsSheet } from "./EquipmentDetailsSheet";
import { CartIndicator } from "./CartIndicator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import type { EquipmentSearchItem } from "@/types";

/**
 * Props for EquipmentSearchContainer component
 */
interface EquipmentSearchContainerProps {
  /** Custom checkout path for cart navigation. Defaults to user checkout route. */
  checkoutPath?: string;
}

/**
 * Container component for equipment search with filtering, pagination, and cart.
 * Handles data fetching and state management for the equipment browsing experience.
 *
 * @param props - Component props
 * @returns Equipment search interface with filters, grid, and cart indicator
 */
function EquipmentSearchContainer({ checkoutPath }: EquipmentSearchContainerProps) {
  const { filters, activeFilters, updateFilter } = useEquipmentSearch();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedEquipment, setSelectedEquipment] = React.useState<EquipmentSearchItem | null>(
    null
  );

  const observerTarget = React.useRef<HTMLDivElement>(null);

  // Fetch equipment types - automatically transformed to camelCase
  const { data: types = [] } = useEquipmentTypes();

  // Fetch equipment list using infinite query
  const { 
    data: equipmentData, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteEquipmentList(activeFilters);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten the pages to a single array of items
  const equipment = React.useMemo(() => {
    return equipmentData?.pages.flatMap((page) => page.equipment) ?? [];
  }, [equipmentData]);
  
  const totalItems = equipmentData?.pages[0]?.pagination.totalItems ?? 0;

  const handleReset = () => {
    updateFilter("search", "");
    updateFilter("typeId", undefined);
    updateFilter("status", undefined);
    updateFilter("availableFrom", undefined);
    updateFilter("availableTo", undefined);
    // Page automatically resets to 1 in hook
  };

  const handleViewDetail = (item: EquipmentSearchItem) => {
    setSelectedEquipment(item);
    setIsDetailsOpen(true);
  };

  return (
    <div
      className="flex flex-col lg:flex-row gap-6 p-6 min-h-[calc(100vh-4rem)]"
      data-testid="equipment-search-container"
    >
      {/* Mobile Filter Trigger */}
      <div className="lg:hidden flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Sprzęt</h1>
        <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtry
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtry</SheetTitle>
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
          <h2 className="text-xl font-bold mb-4">Filtry</h2>
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
          <h1 className="text-3xl font-bold tracking-tight">Inwentarz Sprzętu</h1>
          <div className="text-sm text-muted-foreground">
            Pokazywanie {equipment.length} z {totalItems} elementów
          </div>
        </div>

        <div className="flex-1">
          <EquipmentGrid
            items={equipment}
            isLoading={isLoading}
            error={error as Error | null}
            onViewDetail={handleViewDetail}
          />
        </div>

        {/* Intersection Observer Target */}
        <div ref={observerTarget} className="h-10 w-full mt-4 flex items-center justify-center">
          {isFetchingNextPage && <span className="text-sm text-muted-foreground">Ładowanie kolejnych...</span>}
        </div>
      </main>

      <CartIndicator
        checkoutPath={checkoutPath}
        filterDates={{
          availableFrom: filters.availableFrom,
          availableTo: filters.availableTo,
        }}
      />

      {/* Equipment Details Sheet */}
      <EquipmentDetailsSheet
        isOpen={isDetailsOpen}
        equipment={selectedEquipment}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}

/**
 * Props for EquipmentSearchContainerWithProvider component
 */
interface EquipmentSearchContainerWithProviderProps {
  /** Custom checkout path for cart navigation */
  checkoutPath?: string;
}

/**
 * Wrapper component that provides React Query context for EquipmentSearchContainer.
 * Use this component in Astro pages.
 *
 * @param props - Component props
 * @returns Equipment search container wrapped with QueryProvider
 *
 * @example
 * ```tsx
 * // User equipment page
 * <EquipmentSearchContainerWithProvider client:only="react" />
 *
 * // Admin equipment page
 * <EquipmentSearchContainerWithProvider
 *   client:only="react"
 *   checkoutPath={ROUTES.PROTECTED.ADMIN_RESERVATIONS_CREATE}
 * />
 * ```
 */
export default function EquipmentSearchContainerWithProvider({
  checkoutPath,
}: EquipmentSearchContainerWithProviderProps) {
  return (
    <QueryProvider>
      <EquipmentSearchContainer checkoutPath={checkoutPath} />
    </QueryProvider>
  );
}
