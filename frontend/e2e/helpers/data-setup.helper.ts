import type { SupabaseClient } from '@supabase/supabase-js';
import { E2E_CONFIG } from '../constants';

/**
 * Reset user credits to default balance.
 */
export async function resetCredits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  balance = E2E_CONFIG.DEFAULTS.CREDIT_BALANCE
): Promise<void> {
  await supabaseAdmin
    .from('profiles')
    .update({ credit_balance: balance })
    .eq('id', userId);
}

/**
 * Cancel a reservation and optionally refund credits.
 */
export async function cancelReservation(
  supabaseAdmin: SupabaseClient,
  reservationId: string
): Promise<void> {
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'DENIED' })
    .eq('id', reservationId);
}

/**
 * Clear all pending reservations for a user (test cleanup).
 */
export async function clearPendingReservations(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'DENIED' })
    .eq('user_id', userId)
    .eq('status', 'PENDING');
}
