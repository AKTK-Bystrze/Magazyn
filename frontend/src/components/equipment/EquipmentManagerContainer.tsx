import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useEquipmentManager } from "@/hooks/useEquipmentManager";
import { EquipmentTable } from "./EquipmentTable";
import { EquipmentFilters } from "./EquipmentFilters";
import { AddEquipmentDialog } from "./AddEquipmentDialog";
import { EditEquipmentDialog } from "./EditEquipmentDialog";
import { ConfirmArchiveDialog } from "./ConfirmArchiveDialog";
import { EquipmentDetailsSheet } from "./EquipmentDetailsSheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import {
  ICON_SIZE_SM,
  MESSAGE_AUTO_DISMISS_MS,
  DEFAULT_EQUIPMENT_STATUS_FILTER,
  EQUIPMENT_MANAGER_UI_STRINGS,
} from "@/lib/config/constants";
import type { 
  EquipmentSearchItem, 
  CreateEquipmentCommand, 
  UpdateEquipmentCommand 
} from "@/types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for EquipmentManagerContainer component
 */
interface EquipmentManagerContainerProps {
  /** Placeholder for future extension (e.g., initial filters) */
  className?: string;
}

/**
 * Inner component that uses the useEquipmentManager hook
 * Wrapped by QueryProvider in the exported component
 */
function EquipmentManagerContainerInner({ className }: EquipmentManagerContainerProps) {
  const {
    equipment,
    pagination,
    equipmentTypes,
    isLoading,
    error,
    filters,
    setFilter,
    resetFilters,
    createEquipment,
    updateEquipment,
    archiveEquipment,
    isMutating,
  } = useEquipmentManager();

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = React.useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = React.useState(false);
  const [selectedEquipment, setSelectedEquipment] = React.useState<EquipmentSearchItem | null>(null);

  // Feedback states
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);

  // Clear messages after timeout
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(
        () => setSuccessMessage(null),
        MESSAGE_AUTO_DISMISS_MS
      );
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  React.useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(
        () => setErrorMessage(null),
        MESSAGE_AUTO_DISMISS_MS
      );
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Handle add equipment button click
  const handleAddClick = React.useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  // Handle add dialog close
  const handleAddDialogClose = React.useCallback(() => {
    setIsAddDialogOpen(false);
  }, []);

  // Handle add equipment submit
  const handleAddSubmit = React.useCallback(
    async (command: CreateEquipmentCommand) => {
      await createEquipment(command);
      setSuccessMessage(UI.CREATED_SUCCESS);
      setIsAddDialogOpen(false);
    },
    [createEquipment]
  );

  // Handle edit action
  const handleEditClick = React.useCallback((item: EquipmentSearchItem) => {
    setSelectedEquipment(item);
    setIsEditDialogOpen(true);
  }, []);

  // Handle edit dialog close
  const handleEditDialogClose = React.useCallback(() => {
    setIsEditDialogOpen(false);
    setSelectedEquipment(null);
  }, []);

  // Handle edit equipment submit
  const handleEditSubmit = React.useCallback(
    async (id: string, command: UpdateEquipmentCommand) => {
      await updateEquipment(id, command);
      setSuccessMessage(UI.UPDATED_SUCCESS);
      setIsEditDialogOpen(false);
      setSelectedEquipment(null);
    },
    [updateEquipment]
  );

  // Handle view details action
  const handleViewDetails = React.useCallback((item: EquipmentSearchItem) => {
    setSelectedEquipment(item);
    setIsDetailsSheetOpen(true);
  }, []);

  // Handle archive action
  const handleArchiveClick = React.useCallback((item: EquipmentSearchItem) => {
    setSelectedEquipment(item);
    setArchiveError(null);
    setIsArchiveDialogOpen(true);
  }, []);

  // Handle archive dialog close
  const handleArchiveDialogClose = React.useCallback(() => {
    setIsArchiveDialogOpen(false);
    setSelectedEquipment(null);
    setArchiveError(null);
  }, []);

  // Handle archive confirm
  const handleArchiveConfirm = React.useCallback(
    async (id: string) => {
      try {
        await archiveEquipment(id);
        setSuccessMessage(UI.ARCHIVED_SUCCESS);
        setIsArchiveDialogOpen(false);
        setSelectedEquipment(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to archive";
        setArchiveError(message);
        throw err; // Re-throw so dialog can handle it
      }
    },
    [archiveEquipment]
  );

  // Handle page change
  const handlePageChange = React.useCallback(
    (page: number) => {
      setFilter("page", page);
    },
    [setFilter]
  );

  // Determine if filters are active (for empty state messaging)
  const hasActiveFilters =
    filters.status !== DEFAULT_EQUIPMENT_STATUS_FILTER ||
    (filters.search && filters.search.length > 0) ||
    filters.typeId !== undefined;

  // Handle details sheet close
  const handleDetailsSheetClose = React.useCallback(() => {
    setIsDetailsSheetOpen(false);
    setSelectedEquipment(null);
  }, []);

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{UI.PAGE_TITLE}</h1>
          <p className="text-muted-foreground">{UI.PAGE_DESCRIPTION}</p>
        </div>
        <Button onClick={handleAddClick} className="self-start sm:self-auto">
          <Plus className={ICON_SIZE_SM + " mr-2"} />
          {UI.ADD_EQUIPMENT}
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className={ICON_SIZE_SM + " text-green-600"} />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {(error || errorMessage) && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className={ICON_SIZE_SM} />
          <AlertDescription>
            {errorMessage || error?.message || "An error occurred"}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <EquipmentFilters
        filters={filters}
        equipmentTypes={equipmentTypes}
        onFilterChange={setFilter}
        onReset={hasActiveFilters ? resetFilters : undefined}
      />

      {/* Equipment Table */}
      <EquipmentTable
        equipment={equipment}
        isLoading={isLoading}
        onEdit={handleEditClick}
        onViewDetails={handleViewDetails}
        onArchive={handleArchiveClick}
      />

      {/* Pagination */}
      <Pagination
        currentPage={filters.page}
        totalPages={pagination?.totalPages ?? 0}
        onPageChange={handlePageChange}
      />

      {/* Add Equipment Dialog */}
      <AddEquipmentDialog
        isOpen={isAddDialogOpen}
        isSubmitting={isMutating}
        equipmentTypes={equipmentTypes}
        onClose={handleAddDialogClose}
        onSubmit={handleAddSubmit}
      />

      {/* Edit Equipment Dialog */}
      <EditEquipmentDialog
        isOpen={isEditDialogOpen}
        equipment={selectedEquipment}
        isSubmitting={isMutating}
        onClose={handleEditDialogClose}
        onSubmit={handleEditSubmit}
      />

      {/* Confirm Archive Dialog */}
      <ConfirmArchiveDialog
        isOpen={isArchiveDialogOpen}
        equipment={selectedEquipment}
        isSubmitting={isMutating}
        error={archiveError}
        onClose={handleArchiveDialogClose}
        onConfirm={handleArchiveConfirm}
      />

      {/* Equipment Details Sheet */}
      <EquipmentDetailsSheet
        isOpen={isDetailsSheetOpen}
        equipment={selectedEquipment}
        onClose={handleDetailsSheetClose}
      />
    </div>
  );
}

/**
 * Main equipment manager container with QueryProvider wrapper
 * Handles data fetching, filtering, pagination, and CRUD operations for equipment
 */
export function EquipmentManagerContainer(props: EquipmentManagerContainerProps) {
  return (
    <QueryProvider>
      <EquipmentManagerContainerInner {...props} />
    </QueryProvider>
  );
}

