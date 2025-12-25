# View Implementation Plan: Equipment Manager

## 1. Overview

The **Equipment Manager** view (`/admin/equipment`) is an admin-only interface for managing the equipment inventory. Administrators can add new equipment items, edit all equipment parameters, archive (soft delete) equipment, and view detailed equipment information including reservation history and status change logs.

**Key Features:**
- Master equipment list with filtering and pagination
- Add new equipment with image upload
- Edit all equipment fields (name, description, status, type, image)
- Archive equipment (soft delete)
- View equipment details with reservation history and maintenance logs
- Quick status toggle (OK ↔ Broken)
- Maintenance log management

## 2. View Routing

- **Path**: `/admin/equipment`
- **Access**: Admin and SuperAdmin roles only
- **Layout**: Admin layout with top navigation

## 3. Component Structure

```
EquipmentManagerPage (Astro)
└── EquipmentManagerContainer (React)
    ├── EquipmentToolbar
    │   ├── SearchInput
    │   ├── StatusFilter
    │   ├── TypeFilter
    │   └── AddEquipmentButton
    ├── EquipmentTable (DataTable)
    │   ├── EquipmentRow
    │   │   ├── StatusBadge
    │   │   ├── ActionDropdown
    │   │   │   ├── EditAction
    │   │   │   ├── ViewDetailsAction
    │   │   │   └── ArchiveAction
    │   │   └── QuickStatusToggle
    │   └── Pagination
    ├── AddEquipmentDialog
    │   ├── EquipmentForm
    │   │   ├── BasicInfoSection
    │   │   ├── TypeSelector (with Create New option)
    │   │   ├── StatusSelector
    │   │   └── ImageUploader
    │   └── DialogActions
    ├── EditEquipmentDialog
    │   ├── EquipmentForm
    │   └── DialogActions
    ├── EquipmentDetailsDrawer
    │   ├── EquipmentHero (image, name, status)
    │   ├── EquipmentInfo (specs, description)
    │   ├── MaintenanceLogSection
    │   │   ├── MaintenanceTimeline
    │   │   └── AddMaintenanceLogButton
    │   └── ReservationHistorySection
    │       └── ReservationHistoryList
    └── ConfirmArchiveDialog
```

## 4. Component Details

### EquipmentManagerContainer
- **Description**: Main React container managing state and data fetching for equipment management
- **Main elements**: Toolbar, DataTable, Dialogs, Drawer
- **Handled interactions**: 
  - Filter changes
  - Add/Edit/Archive equipment
  - View details
- **Types**: `Equipment[]`, `EquipmentType[]`, `PaginationMeta`
- **Props**: None (root container)

### EquipmentToolbar
- **Description**: Toolbar with search, filters, and add button
- **Main elements**: Input, Select dropdowns, Button
- **Handled interactions**: 
  - Search input change (debounced 300ms)
  - Filter selection
  - Add button click
- **Validation**: None
- **Types**: `EquipmentSearchParams`
- **Props**: `onFilterChange`, `onAddClick`, `filters`, `equipmentTypes`

### EquipmentTable
- **Description**: Reusable DataTable component displaying equipment list
- **Main elements**: Table headers, rows, pagination controls
- **Handled interactions**:
  - Row click → view details
  - Action dropdown selection
  - Pagination navigation
  - Sort by column
- **Types**: `EquipmentListItem[]`, `PaginationMeta`
- **Props**: `equipment`, `pagination`, `onPageChange`, `onEquipmentAction`, `isLoading`

### AddEquipmentDialog / EditEquipmentDialog
- **Description**: Modal dialogs for creating and editing equipment
- **Main elements**: Form fields, ImageUploader, buttons
- **Handled interactions**:
  - Form field changes
  - Image upload/remove
  - Save/Cancel
  - Create new equipment type inline
- **Validation**:
  - `internal_id`: Required, unique within type
  - `type_id`: Required, must exist
  - `name`: Optional, max 200 characters
  - `description`: Optional
  - `status`: Required, one of: `ok` | `broken`
  - `image`: Optional, max 2MB, JPEG/PNG only
- **Types**: `CreateEquipmentCommand`, `UpdateEquipmentCommand`, `Equipment`
- **Props**: `open`, `onClose`, `onSave`, `equipmentTypes`, `equipment?` (for edit)

### EquipmentDetailsDrawer
- **Description**: Side drawer showing full equipment details, maintenance logs, and reservation history
- **Main elements**: Hero section, info panel, timeline, history list
- **Handled interactions**:
  - Close drawer
  - Add maintenance log
  - Navigate to reservation details
- **Types**: `Equipment`, `MaintenanceLog[]`, `Reservation[]`
- **Props**: `open`, `onClose`, `equipmentId`

### MaintenanceLogSection
- **Description**: Displays chronological maintenance history with add capability
- **Main elements**: Timeline component, Add button, AddMaintenanceLogDialog
- **Handled interactions**:
  - Add log entry
- **Validation**:
  - `notes`: Optional, max 1000 characters
- **Types**: `MaintenanceLog[]`
- **Props**: `logs`, `equipmentId`, `onAddLog`

### ImageUploader
- **Description**: Drag-and-drop image upload component with preview
- **Main elements**: Dropzone, preview, remove button
- **Handled interactions**:
  - File drop/select
  - Remove image
- **Validation**:
  - Max file size: 2MB
  - Accepted formats: JPEG, PNG
- **Types**: `File`, `string` (image URL)
- **Props**: `value`, `onChange`, `onRemove`

### ConfirmArchiveDialog
- **Description**: Confirmation modal for archiving equipment
- **Main elements**: Warning message, equipment info, confirm/cancel buttons
- **Handled interactions**: Confirm/Cancel
- **Validation**: Cannot archive if equipment has active reservations
- **Types**: `Equipment`
- **Props**: `open`, `onClose`, `onConfirm`, `equipment`

## 5. Types

### Existing Types (from `types/equipment/equipment.types.ts`)

```typescript
export type Equipment = {
  id: string;
  internalId: string;
  typeId: string;
  typeName: string;
  name: string | null;
  description: string | null;
  status: "ok" | "broken";
  creditCostPerDay: number;
  imageUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type EquipmentType = {
  id: string;
  name: string;
  creditCostPerDay: number;
  createdAt: string;
};

export type CreateEquipmentCommand = {
  internalId: string;
  typeId: string;
  name?: string;
  description?: string;
  status?: "ok" | "broken";
  imagePath?: string;
};

export type UpdateEquipmentCommand = {
  name?: string;
  description?: string;
  status?: "ok" | "broken";
  imagePath?: string | null;
};
```

### New Types Required

```typescript
// Maintenance log entry
export type MaintenanceLog = {
  id: string;
  equipmentId: string;
  previousStatus: "ok" | "broken";
  newStatus: "ok" | "broken";
  notes: string | null;
  adminId: string;
  adminUsername: string;
  createdAt: string;
};

// Equipment details with maintenance logs (GET /equipment/:id response)
export type EquipmentDetails = Equipment & {
  maintenanceLogs: MaintenanceLog[];
};

// Equipment reservation history item
export type EquipmentReservationHistoryItem = {
  id: string;
  userId: string;
  username: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "RENTED" | "RETURNED" | "DENIED";
  creditCost: number;
  createdAt: string;
};

// Create maintenance log command
export type CreateMaintenanceLogCommand = {
  notes?: string;
};

// Create equipment type command
export type CreateEquipmentTypeCommand = {
  name: string;
  creditCostPerDay: number;
};
```

## 6. State Management

### Custom Hook: `useEquipmentManager`

```typescript
export function useEquipmentManager() {
  // Filter state
  const [filters, setFilters] = useState<EquipmentSearchParams>({
    page: 1,
    perPage: 25,
    search: "",
    type_id: undefined,
    status: undefined,
  });

  // UI state
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  // TanStack Query hooks
  const equipmentQuery = useQuery({
    queryKey: ["equipment", "admin", filters],
    queryFn: () => equipmentApi.listAdmin(filters),
  });

  const typesQuery = useQuery({
    queryKey: ["equipment-types"],
    queryFn: () => equipmentApi.listTypes(),
  });

  // Mutations
  const createMutation = useMutation({...});
  const updateMutation = useMutation({...});
  const archiveMutation = useMutation({...});
  const createTypeMutation = useMutation({...});

  return {
    // State
    filters,
    equipment: equipmentQuery.data?.equipment ?? [],
    pagination: equipmentQuery.data?.pagination,
    equipmentTypes: typesQuery.data ?? [],
    isLoading: equipmentQuery.isLoading,
    selectedEquipment,
    
    // Dialog state
    isAddDialogOpen,
    isEditDialogOpen,
    isDetailsDrawerOpen,
    isArchiveDialogOpen,
    
    // Actions
    setFilters,
    openAddDialog,
    openEditDialog,
    openDetailsDrawer,
    openArchiveDialog,
    closeDialogs,
    createEquipment,
    updateEquipment,
    archiveEquipment,
    createEquipmentType,
  };
}
```

### Custom Hook: `useEquipmentDetails`

```typescript
export function useEquipmentDetails(equipmentId: string | null) {
  const detailsQuery = useQuery({
    queryKey: ["equipment", equipmentId, "details"],
    queryFn: () => equipmentApi.getDetails(equipmentId!),
    enabled: !!equipmentId,
  });

  const maintenanceLogsQuery = useQuery({
    queryKey: ["equipment", equipmentId, "maintenance-logs"],
    queryFn: () => equipmentApi.getMaintenanceLogs(equipmentId!),
    enabled: !!equipmentId,
  });

  const reservationHistoryQuery = useQuery({
    queryKey: ["equipment", equipmentId, "reservations"],
    queryFn: () => reservationsApi.list({ equipment_id: equipmentId }),
    enabled: !!equipmentId,
  });

  const addMaintenanceLogMutation = useMutation({...});

  return {
    equipment: detailsQuery.data,
    maintenanceLogs: maintenanceLogsQuery.data ?? [],
    reservationHistory: reservationHistoryQuery.data?.reservations ?? [],
    isLoading: detailsQuery.isLoading,
    addMaintenanceLog,
  };
}
```

## 7. API Integration

### Equipment Endpoints

| Endpoint | Method | Request Type | Response Type | Description |
|----------|--------|--------------|---------------|-------------|
| `/api/equipment` | GET | `EquipmentSearchParams` | `{ equipment: Equipment[], pagination: PaginationMeta }` | List equipment with filters |
| `/api/equipment/:id` | GET | - | `EquipmentDetails` | Get equipment details with maintenance logs |
| `/api/equipment` | POST | `CreateEquipmentCommand` | `Equipment` | Create new equipment |
| `/api/equipment/:id` | PATCH | `UpdateEquipmentCommand` | `Equipment` | Update equipment |
| `/api/equipment/:id` | DELETE | - | `{ message: string }` | Archive equipment |

### Equipment Types Endpoints

| Endpoint | Method | Request Type | Response Type | Description |
|----------|--------|--------------|---------------|-------------|
| `/api/equipment-types` | GET | - | `{ equipment_types: EquipmentType[] }` | List all types |
| `/api/equipment-types` | POST | `CreateEquipmentTypeCommand` | `EquipmentType` | Create new type |

### Maintenance Logs Endpoints

| Endpoint | Method | Request Type | Response Type | Description |
|----------|--------|--------------|---------------|-------------|
| `/api/equipment/:id/maintenance-logs` | GET | - | `{ maintenance_logs: MaintenanceLog[] }` | Get maintenance history |
| `/api/equipment/:id/maintenance-logs` | POST | `CreateMaintenanceLogCommand` | `MaintenanceLog` | Add maintenance entry |

### Reservations Endpoint (for history)

| Endpoint | Method | Request Type | Response Type | Description |
|----------|--------|--------------|---------------|-------------|
| `/api/reservations` | GET | `{ equipment_id: string }` | `{ reservations: Reservation[] }` | Get reservations for equipment |

## 8. User Interactions

| Interaction | Component | Handler | Result |
|------------|-----------|---------|--------|
| Search equipment | SearchInput | `handleSearchChange` (debounced) | Filter equipment list |
| Filter by status | StatusFilter | `handleStatusFilter` | Filter equipment list |
| Filter by type | TypeFilter | `handleTypeFilter` | Filter equipment list |
| Click "Add Equipment" | AddEquipmentButton | `openAddDialog` | Open add dialog |
| Submit add form | AddEquipmentDialog | `createEquipment` | Create equipment, close dialog, refresh list |
| Click edit action | ActionDropdown | `openEditDialog` | Open edit dialog with equipment data |
| Submit edit form | EditEquipmentDialog | `updateEquipment` | Update equipment, close dialog, refresh list |
| Click view details | ActionDropdown / Row | `openDetailsDrawer` | Open details drawer |
| Click archive action | ActionDropdown | `openArchiveDialog` | Open confirmation dialog |
| Confirm archive | ConfirmArchiveDialog | `archiveEquipment` | Archive equipment, close dialog, refresh list |
| Toggle status | QuickStatusToggle | `toggleStatus` | Update status, show toast, prompt for maintenance notes if broken |
| Add maintenance log | MaintenanceLogSection | `addMaintenanceLog` | Add log entry, refresh logs |
| Upload image | ImageUploader | `handleImageUpload` | Upload to Supabase storage, update form |
| Remove image | ImageUploader | `handleImageRemove` | Clear image field |
| Navigate pages | Pagination | `handlePageChange` | Fetch new page of equipment |

## 9. Conditions and Validation

### Form Validation (Add/Edit Equipment)

| Field | Condition | Error Message |
|-------|-----------|---------------|
| `internal_id` | Required | "Internal ID is required" |
| `internal_id` | Unique within type | "Internal ID already exists for this type" |
| `type_id` | Required | "Equipment type is required" |
| `name` | Max 200 chars | "Name must be 200 characters or less" |
| `image` | Max 2MB | "Image must be 2MB or smaller" |
| `image` | JPEG or PNG | "Only JPEG and PNG images are allowed" |

### Archive Validation

| Condition | Error Message |
|-----------|---------------|
| Has active reservations (PENDING/RENTED) | "Cannot archive equipment with active reservations" |

### Status Change Prompt

| Condition | Action |
|-----------|--------|
| Status changes to "broken" | Show gentle reminder to add maintenance notes |

## 10. Error Handling

| Error Scenario | HTTP Status | User Feedback |
|----------------|-------------|---------------|
| Network error | - | Toast: "Network error. Please check your connection." |
| Unauthorized | 401 | Redirect to login |
| Forbidden | 403 | Toast: "You don't have permission to perform this action." |
| Equipment not found | 404 | Toast: "Equipment not found." |
| Duplicate internal_id | 409 | Form error: "Internal ID already exists for this type." |
| Active reservations (archive) | 409 | Dialog: "Cannot archive equipment with active reservations." |
| Image upload failed | 400/500 | Toast: "Failed to upload image. Please try again." |
| Validation error | 400 | Display field-level errors in form |

## 11. Implementation Steps

### Phase 1: Core Structure
1. [ ] Create `EquipmentManagerContainer.tsx` with basic layout
2. [ ] Implement `useEquipmentManager` hook with TanStack Query
3. [ ] Create `EquipmentToolbar` component with search and filters
4. [ ] Create `EquipmentTable` using existing DataTable pattern

### Phase 2: CRUD Operations
5. [ ] Create `AddEquipmentDialog` with form validation
6. [ ] Create `EditEquipmentDialog` reusing form components
7. [ ] Implement `ImageUploader` with Supabase Storage integration
8. [ ] Create `ConfirmArchiveDialog` with validation
9. [ ] Add mutations for create/update/archive operations

### Phase 3: Details View
10. [ ] Create `EquipmentDetailsDrawer` component
11. [ ] Implement `useEquipmentDetails` hook
12. [ ] Create `MaintenanceLogSection` with timeline
13. [ ] Create `ReservationHistorySection` with history list
14. [ ] Implement add maintenance log functionality

### Phase 4: Equipment Types
15. [ ] Add "Create new type" option to type selector
16. [ ] Create inline `AddEquipmentTypeDialog`
17. [ ] Implement type creation mutation

### Phase 5: Polish
18. [ ] Add status toggle with maintenance note prompt
19. [ ] Implement toast notifications for all actions
20. [ ] Add loading states and skeletons
21. [ ] Ensure mobile responsiveness
22. [ ] Add keyboard navigation for accessibility

---

## 12. Code Reuse and Pattern Compliance

### Existing Components to Reuse

Based on `frontend/docs/architecture.md` and existing implementations, the following components and patterns **MUST** be reused:

#### Container Pattern (Reference: `UserListContainer.tsx`)
```typescript
// Pattern: Container/Inner with QueryProvider wrapper
function EquipmentManagerContainerInner(props: Props) {
  // Use custom hook for data + mutations
  const { data, isLoading, error, ... } = useEquipmentManager();
  // ...
}

export function EquipmentManagerContainer(props: Props) {
  return (
    <QueryProvider>
      <EquipmentManagerContainerInner {...props} />
    </QueryProvider>
  );
}
```

#### Custom Hook Pattern (Reference: `useUsers.ts`)
Create `src/hooks/useEquipmentManager.ts` following `useUsers.ts` pattern:
- TanStack Query for data fetching
- Mutations for create/update/delete
- Filter state management with `setFilter` helper
- Return `{ data, isLoading, error, filters, setFilter, resetFilters, createMutation, updateMutation, archiveMutation, isMutating }`

#### Table Pattern (Reference: `UserTable.tsx`)
Create `EquipmentTable.tsx` following `UserTable.tsx`:
- Use Shadcn `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
- Include `SkeletonRow` inner component for loading state
- Include `EmptyState` inner component
- Use constants: `ICON_SIZE_SM`, `SKELETON_ROW_COUNT`
- Use `formatDateLocalized` from `@/lib/utils/date-utils`

#### Dialog Pattern (Reference: `CreateUserDialog.tsx`, `EditUserDialog.tsx`)
Create dialogs with:
- Props: `isOpen`, `isSubmitting`, `onClose`, `onSubmit`
- `INITIAL_FORM_STATE` constant
- Form validation with constants from `@/lib/config/constants`
- Shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`

#### Filter Pattern (Reference: `UserFilters.tsx`)
Create `EquipmentFilters.tsx` following `UserFilters.tsx` pattern.

### UI Components from Shadcn/UI (Already Installed)
From `components.json` and `src/components/ui/`:
- ✅ Button, Input, Select, Table, Dialog, Alert, Skeleton, Pagination
- ⚠️ May need to install: `Sheet` (for drawer), `DropdownMenu` (for actions)

### Constants to Add (`@/lib/config/constants.ts`)
```typescript
// Add equipment-specific constants
export const EQUIPMENT_STATUS = {
  OK: 'ok',
  BROKEN: 'broken',
} as const;

export const EQUIPMENT_VALIDATION_MESSAGES = {
  INTERNAL_ID_REQUIRED: 'Internal ID is required',
  TYPE_ID_REQUIRED: 'Equipment type is required',
  NAME_MAX_LENGTH: 'Name must be 200 characters or less',
  IMAGE_MAX_SIZE: 'Image must be 2MB or smaller',
  IMAGE_INVALID_TYPE: 'Only JPEG and PNG images are allowed',
};
```

### Types Organization
Per `frontend/docs/architecture.md`, add types to:
- `src/types/equipment/equipment.types.ts` - existing, extend with new types
- `src/types/equipment/maintenance.types.ts` - new file for `MaintenanceLog` types
- `src/types/equipment/dtos.types.ts` - existing, add backend DTOs

### Transformer Layer
Following the **Type-Safe Transformer Pattern**:
1. **DTOs** in `types/equipment/dtos.types.ts` (Backend shape, snake_case)
2. **Validators** in `lib/validators/equipment.validator.ts` (Zod schemas)
3. **Transformers** in `lib/transformers/equipment.transformer.ts` (Functions)
4. **Frontend Types** in `types/equipment/equipment.types.ts` (App shape, camelCase)

### API Layer
Extend existing `src/lib/api/equipment-api.ts`:
```typescript
export const equipmentApi = {
  // Existing
  list: async (params) => { ... },
  listTypes: async () => { ... },
  
  // Add for Equipment Manager
  getDetails: async (id: string) => { ... },
  create: async (command: CreateEquipmentCommand) => { ... },
  update: async (id: string, command: UpdateEquipmentCommand) => { ... },
  archive: async (id: string) => { ... },
  
  // Maintenance logs
  getMaintenanceLogs: async (equipmentId: string) => { ... },
  addMaintenanceLog: async (equipmentId: string, command: CreateMaintenanceLogCommand) => { ... },
};
```

### API Proxy Endpoints
Add to `src/pages/api/equipment/`:
- `[id].ts` - GET (details), PATCH (update), DELETE (archive)
- `[id]/maintenance-logs.ts` - GET, POST

### File Organization
```
src/
├── components/
│   └── equipment/
│       ├── EquipmentCard.tsx        # Existing - reuse
│       ├── EquipmentGrid.tsx        # Existing - reuse  
│       ├── EquipmentSearchContainer.tsx # Existing - reference
│       ├── EquipmentManagerContainer.tsx # NEW
│       ├── EquipmentTable.tsx       # NEW
│       ├── EquipmentFilters.tsx     # NEW
│       ├── AddEquipmentDialog.tsx   # NEW
│       ├── EditEquipmentDialog.tsx  # NEW
│       ├── EquipmentDetailsSheet.tsx # NEW (use Sheet, not custom Drawer)
│       ├── ConfirmArchiveDialog.tsx # NEW
│       └── MaintenanceLogSection.tsx # NEW
├── hooks/
│   ├── use-equipment-search.ts      # Existing
│   └── useEquipmentManager.ts       # NEW
└── pages/
    └── admin/
        └── equipment.astro          # Existing - update
```

### Coding Standards Alignment

From `frontend/docs/coding_standards.md`:

1. **Naming**:
   - Files: PascalCase for React (`EquipmentTable.tsx`)
   - Handlers: `handle` prefix (`handleEditClick`)
   - Callbacks: `on` prefix (`onEdit`)
   - Boolean: `is`/`has` prefix (`isLoading`)

2. **Guards & Early Returns**:
   ```typescript
   if (isLoading) return <SkeletonRow />;
   if (error) return <ErrorMessage error={error} />;
   if (!data?.equipment?.length) return <EmptyState />;
   ```

3. **React Best Practices**:
   - Use `React.useCallback` for handlers passed to children
   - Use `React.useState` with lazy initializer for QueryClient
   - No `"use client"` directives (Astro, not Next.js)

4. **Accessibility**:
   - Use `aria-label` for icon-only buttons
   - Use semantic HTML (`role="list"`, `role="listitem"`)
   - Use `aria-expanded` for dialogs/sheets

---

## User Stories Addressed

- **US-029**: Admin - Add Equipment
- **US-030**: Admin - Edit Equipment
- **US-032**: Admin - Add Maintenance Log Entry
- **US-044**: Handle Image Upload Errors
- **US-055**: View Maintenance History

## Tech Stack Reference

- **Astro 5**: SSR page at `/admin/equipment`
- **React 19**: Interactive container and components
- **TanStack Query**: Data fetching and caching
- **Shadcn/UI**: DataTable, Dialog, Drawer, Input, Select, Button, Toast
- **Tailwind CSS**: Styling
- **Supabase Storage**: Image upload

## Endpoint Implementation References

- Backend equipment handler: `backend/internal/handler/equipment/equipment_handler.go`
- Backend equipment service: `backend/internal/service/equipment/equipment_service.go`
- Frontend API client: `frontend/src/lib/api/equipment-api.ts`
- Frontend types: `frontend/src/types/equipment/equipment.types.ts`
