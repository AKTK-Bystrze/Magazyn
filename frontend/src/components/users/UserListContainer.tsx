import * as React from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useUsers } from "@/hooks/useUsers";
import { UserTable } from "./UserTable";
import { UserFilters } from "./UserFilters";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { AdjustCreditsDialog } from "./AdjustCreditsDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Coins,
} from "lucide-react";
import {
  ICON_SIZE_SM,
  MESSAGE_AUTO_DISMISS_MS,
  DEFAULT_ROLE_FILTER,
} from "@/lib/config/constants";
import type { UserListItem, CreateUserCommand, UpdateUserCommand } from "@/types";

/**
 * Props for UserListContainer component
 */
interface UserListContainerProps {
  /** Whether current user is super admin (can create/edit users) */
  isSuperAdmin: boolean;
}

/**
 * Inner component that uses the useUsers hook
 * Wrapped by QueryProvider in the exported component
 */
function UserListContainerInner({ isSuperAdmin }: UserListContainerProps) {
  const {
    data,
    isLoading,
    error,
    filters,
    setFilter,
    resetFilters,
    createUser,
    updateUser,
    bulkAdjustCredits,
    isMutating,
  } = useUsers();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [adjustCreditsOpen, setAdjustCreditsOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserListItem | null>(
    null
  );

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Reset selection when users change (filters, page, etc)
  React.useEffect(() => {
    setSelectedIds([]);
  }, [data?.users]);

  // Feedback states
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

  // Handle create user button click
  const handleCreateClick = React.useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  // Handle create user dialog close
  const handleCreateDialogClose = React.useCallback(() => {
    setCreateDialogOpen(false);
  }, []);

  // Handle create user submit
  const handleCreateSubmit = React.useCallback(
    async (command: CreateUserCommand) => {
      const user = await createUser(command);
      setSuccessMessage(
        `Użytkownik "${user.username}" został pomyślnie utworzony.`
      );
      setCreateDialogOpen(false);
    },
    [createUser]
  );

  // Handle edit button click
  const handleEditClick = React.useCallback((user: UserListItem) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  // Handle edit dialog close
  const handleEditDialogClose = React.useCallback(() => {
    setEditDialogOpen(false);
    setSelectedUser(null);
  }, []);

  // Handle edit user submit
  const handleEditSubmit = React.useCallback(
    async (userId: string, command: UpdateUserCommand) => {
      const user = await updateUser(userId, command);
      setSuccessMessage(
        `Użytkownik "${user.username}" został pomyślnie zaktualizowany.`
      );
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    [updateUser]
  );

  // Handle page change
  const handlePageChange = React.useCallback(
    (page: number) => {
      setFilter("page", page);
    },
    [setFilter]
  );

  // Handlers for selection
  const handleToggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleToggleSelectAll = React.useCallback(
    (checked: boolean, ids: string[]) => {
      setSelectedIds(checked ? ids : []);
    },
    []
  );

  // Handlers for adjust credits
  const handleAdjustCreditsClick = React.useCallback(() => {
    setAdjustCreditsOpen(true);
  }, []);

  const handleAdjustCreditsSubmit = React.useCallback(
    async (command: { userIds: string[]; amount: number; reason: string; description?: string }) => {
      await bulkAdjustCredits(command);
      setSuccessMessage(`Godzinki dostosowane dla ${selectedIds.length} użytkowników.`);
      setAdjustCreditsOpen(false);
      setSelectedIds([]);
    },
    [bulkAdjustCredits, selectedIds.length]
  );

  // Determine if filters are active (for empty state messaging)
  const hasActiveFilters =
    filters.role !== DEFAULT_ROLE_FILTER ||
    (filters.search && filters.search.length > 0);

  return (
    <div className="space-y-6" data-testid="user-list-container">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zarządzaj Użytkownikami</h1>
          <p className="text-muted-foreground">
            Przeglądaj i zarządzaj kontami użytkowników, rolami i saldem godzinek.
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-col sm:flex-row items-center gap-2 self-start sm:self-auto">
            {selectedIds.length > 0 && (
              <Button
                variant="outline"
                className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 w-full sm:w-auto"
                onClick={handleAdjustCreditsClick}
              >
                <Coins className={ICON_SIZE_SM} />
                Dostosuj Godzinki ({selectedIds.length})
              </Button>
            )}
            <Button onClick={handleCreateClick} className="flex items-center gap-2 w-full sm:w-auto">
              <UserPlus className={ICON_SIZE_SM + " mr-2"} />
              Utwórz Użytkownika
            </Button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950" data-testid="admin-success-alert">
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
            {errorMessage || error?.message || "Wystąpił błąd"}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFilterChange={setFilter}
        onReset={hasActiveFilters ? resetFilters : undefined}
      />

      {/* User Table */}
      <UserTable
        users={data?.users ?? []}
        isLoading={isLoading}
        isSuperAdmin={isSuperAdmin}
        onEdit={handleEditClick}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
      />

      {/* Pagination */}
      <Pagination
        currentPage={filters.page}
        totalPages={data?.pagination.totalPages ?? 0}
        onPageChange={handlePageChange}
      />

      {/* Create User Dialog */}
      {isSuperAdmin && (
        <CreateUserDialog
          isOpen={createDialogOpen}
          isSubmitting={isMutating}
          onClose={handleCreateDialogClose}
          onSubmit={handleCreateSubmit}
        />
      )}

      {/* Edit User Dialog */}
      {isSuperAdmin && (
        <EditUserDialog
          isOpen={editDialogOpen}
          user={selectedUser}
          isSubmitting={isMutating}
          onClose={handleEditDialogClose}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Adjust Credits Dialog */}
      {isSuperAdmin && (
        <AdjustCreditsDialog
          isOpen={adjustCreditsOpen}
          isSubmitting={isMutating}
          userIds={selectedIds}
          onClose={() => setAdjustCreditsOpen(false)}
          onSubmit={handleAdjustCreditsSubmit}
        />
      )}
    </div>
  );
}

/**
 * Main user list container with QueryProvider wrapper
 * Handles data fetching, filtering, pagination, and CRUD operations
 *
 * @param isSuperAdmin - Whether current user can create/edit users
 */
export function UserListContainer(props: UserListContainerProps) {
  return (
    <QueryProvider>
      <UserListContainerInner {...props} />
    </QueryProvider>
  );
}
