import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';

export const ADMIN_ROLE = 'admin';
export const SUPER_ADMIN_ROLE = 'super_admin';

export type UserRole = typeof ADMIN_ROLE | typeof SUPER_ADMIN_ROLE | string;

/**
 * Fetch the user's role from the profiles table
 */
export async function getUserRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data.role;
}

/**
 * Check if a user has one of the allowed roles
 */
export async function requireRole(
  supabase: SupabaseClient<Database>,
  user: User,
  allowedRoles: string[]
): Promise<boolean> {
  if (!user) return false;
  
  const role = await getUserRole(supabase, user.id);
  return role ? allowedRoles.includes(role) : false;
}
