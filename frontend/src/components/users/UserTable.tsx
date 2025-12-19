import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleBadge } from "./RoleBadge";
import { Pencil } from "lucide-react";
import { ICON_SIZE_SM, SKELETON_ROW_COUNT } from "@/lib/config/constants";
import { formatDateLocalized } from "@/lib/utils/date-utils";
import type { UserListItem } from "@/types";

/**
 * Props for the UserTable component
 */
interface UserTableProps {
  /** List of users to display */
  users: UserListItem[];
  /** Loading state */
  isLoading: boolean;
  /** Whether current user is super admin (can edit) */
  isSuperAdmin: boolean;
  /** Callback when edit button is clicked */
  onEdit: (user: UserListItem) => void;
  /** IDs of currently selected users */
  selectedIds?: string[];
  /** Callback when a user row checkbox is clicked */
  onToggleSelect?: (userId: string) => void;
  /** Callback when the header checkbox is clicked */
  onToggleSelectAll?: (checked: boolean, ids: string[]) => void;
}

/**
 * Loading skeleton row component
 */
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32 mt-1 md:hidden" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  );
}

/**
 * Empty state component when no users are found
 */
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-24 text-center">
        <p className="text-muted-foreground">No users found</p>
      </TableCell>
    </TableRow>
  );
}

/**
 * Data table displaying user list with columns for username, email, credits, role, created date, and actions
 * Uses Shadcn Table components
 *
 * @param users - List of users to display
 * @param isLoading - Loading state
 * @param isSuperAdmin - Whether current user can edit
 * @param onEdit - Callback when edit button clicked
 */
export function UserTable({
  users,
  isLoading,
  isSuperAdmin,
  onEdit,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}: UserTableProps) {
  const handleEdit = React.useCallback(
    (user: UserListItem) => () => {
      onEdit(user);
    },
    [onEdit]
  );

  const allSelected = users.length > 0 && selectedIds.length === users.length;
  const ids = users.map((u) => u.id);

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {isSuperAdmin && (
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onToggleSelectAll?.(checked, ids)}
                  aria-label="Select all users"
                />
              </TableHead>
            )}
            <TableHead>Username</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell text-right">Credits</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden xl:table-cell">Created</TableHead>
            {isSuperAdmin && <TableHead className="w-[70px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <SkeletonRow key={`skeleton-${index}`} />
            ))
          ) : users.length === 0 ? (
            <EmptyState />
          ) : (
            // User rows
            users.map((user) => (
              <TableRow
                key={user.id}
                className={`hover:bg-muted/50 ${!user.isEnabled ? "opacity-60 bg-muted/20" : ""
                  } ${selectedIds.includes(user.id) ? "bg-muted/30" : ""}`}
              >
                {isSuperAdmin && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(user.id)}
                      onCheckedChange={() => onToggleSelect?.(user.id)}
                      aria-label={`Select ${user.username}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="font-medium">{user.username}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{user.email}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums">
                  {user.creditBalance}
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.isEnabled ? (
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-500/15 text-green-700 hover:bg-green-500/25">
                      Active
                    </div>
                  ) : (
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25">
                      Disabled
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-muted-foreground">
                  {formatDateLocalized(user.createdAt)}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEdit(user)}
                      aria-label={`Edit ${user.username}`}
                    >
                      <Pencil className={ICON_SIZE_SM} />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
