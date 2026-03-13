import type { User } from "@supabase/supabase-js";
import type { SessionInfo } from "../../types";
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from './roles';
import {
  getDefaultRouteForUser as getDefaultRouteForUserBase,
  hasRole as hasRoleBase
} from "./redirect-manager";

export function getDefaultRouteForUser(user: User | null, sessionInfo?: SessionInfo | null): string {
  return getDefaultRouteForUserBase(user, sessionInfo || null);
}

export function isAdmin(sessionInfo: SessionInfo | null): boolean {
  if (!sessionInfo) return false;
  const role = sessionInfo.role;
  return role === ADMIN_ROLE || role === SUPER_ADMIN_ROLE;
}

export function isSuperAdmin(sessionInfo: SessionInfo | null): boolean {
  if (!sessionInfo) return false;
  return sessionInfo.role === SUPER_ADMIN_ROLE;
}

export function hasRole(
  sessionInfo: SessionInfo | null,
  allowedRoles: string[]
): boolean {
  return hasRoleBase(sessionInfo?.role, allowedRoles);
}
