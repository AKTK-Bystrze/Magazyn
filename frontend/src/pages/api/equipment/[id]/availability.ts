import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  uuidParamSchema,
  availabilityQuerySchema,
  type AvailabilityResponse,
  type ConflictingReservation,
} from '../../../../lib/schemas/equipment.schema';
import type { SupabaseClient } from '../../../../db/supabase.client';

// =============================================================================
// Helper Functions
// =============================================================================

async function getAuthenticatedUser(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return session.user;
}

// =============================================================================
// GET /api/equipment/:id/availability - Check Availability
// =============================================================================

export const GET: APIRoute = async ({ params, request, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  // 1. Authentication
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Validate ID parameter
    const id = uuidParamSchema.parse(params.id);

    // 3. Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const validated = availabilityQuerySchema.parse(queryParams);

    // 4. Verify equipment exists
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('id')
      .eq('id', id)
      .single();

    if (equipError || !equipment) {
      return new Response(
        JSON.stringify({ error: 'Equipment not found', code: 'EQUIPMENT_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Query reservations that overlap with requested date range
    // Overlap condition: (reservation.start_date <= query.end_date) AND (reservation.end_date >= query.start_date)
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, start_date, end_date, status')
      .eq('equipment_id', id)
      .lte('start_date', validated.end_date)
      .gte('end_date', validated.start_date)
      .in('status', ['PENDING', 'RENTED']);

    if (resError) {
      console.error('Availability check error:', resError);
      return new Response(
        JSON.stringify({ error: 'Failed to check availability', code: 'DATABASE_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Transform to conflicting reservations
    const conflicts: ConflictingReservation[] = (reservations || []).map((r) => ({
      id: r.id,
      start_date: r.start_date,
      end_date: r.end_date,
      status: r.status,
    }));

    // 7. Build response
    const response: AvailabilityResponse = {
      equipment_id: id,
      is_available: conflicts.length === 0,
      conflicting_reservations: conflicts,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Availability check error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
