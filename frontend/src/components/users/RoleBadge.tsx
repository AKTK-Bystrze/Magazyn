import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { USER_ROLE_LABELS, USER_ROLE_VARIANTS } from "@/lib/config/constants";
import type { Enums } from "@/db/database.types";

/**
 * Props for the RoleBadge component
 */
interface RoleBadgeProps {
  /** User role from database enum */
  role: Enums<"user_role">;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Displays a user role as a styled badge
 * Automatically applies variant and label based on role
 *
 * @param role - User role from database enum
 * @param className - Optional additional CSS classes
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  const variant = USER_ROLE_VARIANTS[role] ?? "outline";
  const label = USER_ROLE_LABELS[role] ?? role;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
