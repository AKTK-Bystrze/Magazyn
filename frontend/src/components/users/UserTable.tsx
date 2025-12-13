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
}

/**
 * Loading skeleton row component
 */
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
      <TableCell colSpan={6} className="h-24 text-center">
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
}: UserTableProps) {
  const handleEdit = React.useCallback(
    (user: UserListItem) => () => {
      onEdit(user);
    },
    [onEdit]
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Credits</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
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
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {user.creditBalance}
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell className="text-muted-foreground">
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
