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
import { AlertCircle, CheckCircle2, UserPlus, Coins } from "lucide-react";
import { ICON_SIZE_SM, DEFAULT_ROLE_FILTER } from "@/lib/config/constants";
import { useInfiniteScrollTrigger } from "@/lib/hooks/useInfiniteScrollTrigger";
import { useDismissibleMessage } from "@/lib/hooks/useDismissibleMessage";
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
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUsers();

  const observerTarget = useInfiniteScrollTrigger<HTMLDivElement>({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [adjustCreditsOpen, setAdjustCreditsOpen] = React.useState(false);
  const [creditAdjustmentUserIds, setCreditAdjustmentUserIds] = React.useState<string[]>([]);
  const [selectedUserForCredits, setSelectedUserForCredits] = React.useState<UserListItem | null>(
    null
  );
  const [selectedUser, setSelectedUser] = React.useState<UserListItem | null>(null);

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setSelectedIds([]);
  }, [data?.users]);

  const [successMessage, setSuccessMessage] = useDismissibleMessage();

  const handleCreateClick = React.useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCreateDialogClose = React.useCallback(() => {
    setCreateDialogOpen(false);
  }, []);

  const handleCreateSubmit = React.useCallback(
    async (command: CreateUserCommand) => {
      const user = await createUser(command);
      setSuccessMessage(`Użytkownik "${user.username}" został pomyślnie utworzony.`);
      setCreateDialogOpen(false);
    },
    [createUser, setSuccessMessage]
  );

  const handleEditClick = React.useCallback((user: UserListItem) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  const handleEditDialogClose = React.useCallback(() => {
    setEditDialogOpen(false);
    setSelectedUser(null);
  }, []);

  const handleEditSubmit = React.useCallback(
    async (userId: string, command: UpdateUserCommand) => {
      const user = await updateUser(userId, command);
      setSuccessMessage(`Użytkownik "${user.username}" został pomyślnie zaktualizowany.`);
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    [updateUser, setSuccessMessage]
  );

  const handleToggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  const handleToggleSelectAll = React.useCallback((checked: boolean, ids: string[]) => {
    setSelectedIds(checked ? ids : []);
  }, []);

  const handleAdjustCreditsClick = React.useCallback(() => {
    setSelectedUserForCredits(null);
    setCreditAdjustmentUserIds(selectedIds);
    setAdjustCreditsOpen(true);
  }, [selectedIds]);

  const handleAdjustSingleUserCredits = React.useCallback((user: UserListItem) => {
    setSelectedUserForCredits(user);
    setCreditAdjustmentUserIds([user.id]);
    setAdjustCreditsOpen(true);
  }, []);

  const handleCloseAdjustCredits = React.useCallback(() => {
    setAdjustCreditsOpen(false);
    setSelectedUserForCredits(null);
    setCreditAdjustmentUserIds([]);
  }, []);

  const handleAdjustCreditsSubmit = React.useCallback(
    async (command: {
      userIds: string[];
      amount: number;
      reason: string;
      description?: string;
    }) => {
      await bulkAdjustCredits(command);
      const userCount = command.userIds.length;
      setSuccessMessage(
        `Godzinki dostosowane dla ${userCount} ${userCount === 1 ? "użytkownika" : "użytkowników"}.`
      );
      handleCloseAdjustCredits();
      setSelectedIds([]);
    },
    [bulkAdjustCredits, handleCloseAdjustCredits, setSuccessMessage]
  );

  const hasActiveFilters =
    filters.role !== DEFAULT_ROLE_FILTER || (filters.search && filters.search.length > 0);

  return (
    <div className="space-y-6" data-testid="user-list-container">
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
            <Button
              onClick={handleCreateClick}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <UserPlus className={ICON_SIZE_SM + " mr-2"} />
              Utwórz Użytkownika
            </Button>
          </div>
        )}
      </div>

      {successMessage && (
        <Alert
          className="border-green-500 bg-green-50 dark:bg-green-950"
          data-testid="admin-success-alert"
        >
          <CheckCircle2 className={ICON_SIZE_SM + " text-green-600"} />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className={ICON_SIZE_SM} />
          <AlertDescription>{error.message || "Wystąpił błąd"}</AlertDescription>
        </Alert>
      )}

      <UserFilters
        filters={filters}
        onFilterChange={setFilter}
        onReset={hasActiveFilters ? resetFilters : undefined}
      />

      <UserTable
        users={data?.users ?? []}
        isLoading={isLoading}
        isSuperAdmin={isSuperAdmin}
        onEdit={handleEditClick}
        onAdjustCredits={handleAdjustSingleUserCredits}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
      />

      <div ref={observerTarget} className="h-10 w-full mt-4 flex items-center justify-center">
        {isFetchingNextPage && (
          <span className="text-sm text-muted-foreground">Ładowanie kolejnych...</span>
        )}
      </div>

      {isSuperAdmin && (
        <CreateUserDialog
          isOpen={createDialogOpen}
          isSubmitting={isMutating}
          onClose={handleCreateDialogClose}
          onSubmit={handleCreateSubmit}
        />
      )}

      {isSuperAdmin && (
        <EditUserDialog
          isOpen={editDialogOpen}
          user={selectedUser}
          isSubmitting={isMutating}
          onClose={handleEditDialogClose}
          onSubmit={handleEditSubmit}
        />
      )}

      {isSuperAdmin && (
        <AdjustCreditsDialog
          isOpen={adjustCreditsOpen}
          isSubmitting={isMutating}
          userIds={creditAdjustmentUserIds}
          targetUser={selectedUserForCredits ?? undefined}
          onClose={handleCloseAdjustCredits}
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
