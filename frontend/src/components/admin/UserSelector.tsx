import * as React from "react";
import { useUsers } from "@/hooks/useUsers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, User, CreditCard } from "lucide-react";
import type { UserListItem } from "@/types";

/**
 * Props for UserSelector component
 */
interface UserSelectorProps {
  /** Currently selected user ID */
  selectedUserId: string | null;
  /** Callback when a user is selected, returns full user object for credit balance access */
  onSelect: (user: UserListItem) => void;
  /** Optional label text override */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Searchable dropdown component for selecting a user.
 * Used by admins to create reservations on behalf of other users.
 * Returns the full user object to allow parent to access creditBalance.
 *
 * @param props - Component props
 * @returns User selector dropdown
 *
 * @example
 * ```tsx
 * <UserSelector
 *   selectedUserId={userId}
 *   onSelect={(user) => {
 *     setUserId(user.id);
 *     setCreditBalance(user.creditBalance);
 *   }}
 * />
 * ```
 */
export function UserSelector({
  selectedUserId,
  onSelect,
  label = "Select User",
  disabled = false,
}: UserSelectorProps) {
  const { data, isLoading, error } = useUsers({
    initialFilters: { perPage: 100 }, // Fetch more users for selection
  });

  const users = data?.users ?? [];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load users</span>
        </div>
      </div>
    );
  }

  // No users available
  if (users.length === 0) {
    return (
      <div className="rounded-md border border-muted bg-muted/50 p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>No users available</span>
        </div>
      </div>
    );
  }

  const selectedUser = users.find((u: UserListItem) => u.id === selectedUserId);

  const handleValueChange = (userId: string) => {
    const user = users.find((u: UserListItem) => u.id === userId);
    if (user) {
      onSelect(user);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="user-selector">{label}</Label>
      <Select
        value={selectedUserId ?? ""}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="user-selector" className="w-full">
          <SelectValue placeholder="Choose a user...">
            {selectedUser && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{selectedUser.username}</span>
                <span className="text-muted-foreground">
                  ({selectedUser.email})
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {users.map((user: UserListItem) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.username}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    {user.creditBalance} credits
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show selected user's credit balance */}
      {selectedUser && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <CreditCard className="h-4 w-4" />
          Selected user has <strong>{selectedUser.creditBalance}</strong> credits available
        </p>
      )}
    </div>
  );
}

