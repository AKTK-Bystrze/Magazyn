import type { EquipmentSearchParams, EquipmentType } from '@/types';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FilterSidebarProps {
  filters: EquipmentSearchParams;
  onFilterChange: (key: keyof EquipmentSearchParams, value: any) => void;
  types: EquipmentType[];
}

export function FilterSidebar({ filters, onFilterChange, types }: FilterSidebarProps) {
  const [localSearch, setLocalSearch] = useState(filters.q || '');

  // Update local input state when external filter changes
  useEffect(() => {
    setLocalSearch(filters.q || '');
  }, [filters.q]);

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (filters.q || '')) {
        onFilterChange('q', localSearch);
      }
    }, 400); 

    return () => clearTimeout(timer);
  }, [localSearch, onFilterChange, filters.q]);

  const handleStatusChange = (status: string) => {
    onFilterChange('status', status === 'all' ? undefined : status);
  };

  const handleTypeChange = (typeId: string) => {
      onFilterChange('type_id', typeId === 'all' ? undefined : typeId);
  };

  return (
    <div className="space-y-6 w-full lg:w-64 flex-shrink-0">
      <div className="space-y-2">
        <Label>Search</Label>
        <Input 
          placeholder="Search by name..." 
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.type_id || 'all'}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <option value="all">All Types</option>
          {types.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-col gap-2">
           {['all', 'ok', 'broken', 'blocked'].map((status) => (
             <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
               <input 
                 type="radio" 
                 name="status"
                 value={status}
                 checked={(filters.status || 'all') === status}
                 onChange={() => handleStatusChange(status)}
                 className="accent-primary w-4 h-4"
               />
               <span className="capitalize">{status === 'all' ? 'All Statuses' : status}</span>
             </label>
           ))}
        </div>
      </div>

      <div className="pt-4">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            setLocalSearch(''); 
            onFilterChange('q', '');
            onFilterChange('type_id', undefined);
            onFilterChange('status', undefined);
          }}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
