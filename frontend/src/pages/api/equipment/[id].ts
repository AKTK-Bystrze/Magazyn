import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  uuidParamSchema,
  updateEquipmentSchema,
  type EquipmentDetailDTO,
  type EquipmentDTO,
  type MaintenanceLogDTO,
  type MessageResponse,
} from '../../../lib/schemas/equipment.schema';
import type { SupabaseClient } from '../../../db/supabase.client';

// =============================================================================
// Helper Functions (shared with index.ts)
// =============================================================================

async function getAuthenticatedUser(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return session.user;
}

async function getUserRole(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return data?.role || null;
}

function generateImageURL(supabase: SupabaseClient, imagePath: string | null): string | null {
  if (!imagePath) return null;
  const { data } = supabase.storage.from('equipment').getPublicUrl(imagePath);
  return data.publicUrl;
}

// =============================================================================
// GET /api/equipment/:id - Get Equipment Details
// =============================================================================

export const GET: APIRoute = async ({ params, locals }) => {
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

    // 3. Query equipment with type join
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('*, equipment_types!inner(name, credit_cost_per_day)')
      .eq('id', id)
      .single();

    if (error || !equipment) {
      return new Response(
        JSON.stringify({ error: 'Equipment not found', code: 'EQUIPMENT_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Query maintenance logs with admin username
    const { data: logs } = await supabase
      .from('maintenance_logs')
      .select('*, profiles!admin_id(username)')
      .eq('equipment_id', id)
      .order('created_at', { ascending: false });

    // 5. Transform maintenance logs
    const maintenanceLogs: MaintenanceLogDTO[] = (logs || []).map((log: any) => ({
      id: log.id,
      previous_status: log.previous_status,
      new_status: log.new_status,
      notes: log.notes,
      admin_username: log.profiles?.username || 'System',
      created_at: log.created_at,
    }));

    // 6. Build detail response
    const response: EquipmentDetailDTO = {
      id: equipment.id,
      internal_id: equipment.internal_id,
      type_id: equipment.type_id,
      type_name: equipment.equipment_types.name,
      name: equipment.name,
      description: equipment.description,
      status: equipment.status,
      credit_cost_per_day: equipment.equipment_types.credit_cost_per_day,
      image_url: generateImageURL(supabase, equipment.image_path),
      is_archived: equipment.is_archived,
      created_at: equipment.created_at,
      updated_at: equipment.updated_at,
      maintenance_logs: maintenanceLogs,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid equipment ID',
          code: 'VALIDATION_ERROR',
          details: error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Equipment detail error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// =============================================================================
// PATCH /api/equipment/:id - Update Equipment
// =============================================================================

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  // 1. Authentication
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Authorization check (Admin/SuperAdmin only)
  const role = await getUserRole(supabase, user.id);
  if (!role || !['admin', 'super_admin'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 3. Validate ID and body
    const id = uuidParamSchema.parse(params.id);
    const body = await request.json();
    const validated = updateEquipmentSchema.parse(body);

    // 4. Verify equipment exists
    const { data: existing, error: existError } = await supabase
      .from('equipment')
      .select('id')
      .eq('id', id)
      .single();

    if (existError || !existing) {
      return new Response(
        JSON.stringify({ error: 'Equipment not found', code: 'EQUIPMENT_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Build update object
    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.image_path !== undefined) updateData.image_path = validated.image_path;

    // 6. Execute update
    const { error: updateError } = await supabase
      .from('equipment')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Equipment update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update equipment', code: 'DATABASE_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Fetch updated equipment with type info
    const { data: updated } = await supabase
      .from('equipment')
      .select('*, equipment_types!inner(name, credit_cost_per_day)')
      .eq('id', id)
      .single();

    if (!updated) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch updated equipment' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8. Return updated DTO
    const response: EquipmentDTO = {
      id: updated.id,
      internal_id: updated.internal_id,
      type_id: updated.type_id,
      type_name: updated.equipment_types.name,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      credit_cost_per_day: updated.equipment_types.credit_cost_per_day,
      image_url: generateImageURL(supabase, updated.image_path),
      is_archived: updated.is_archived,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
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

    console.error('Equipment update error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// =============================================================================
// DELETE /api/equipment/:id - Archive Equipment
// =============================================================================

export const DELETE: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  // 1. Authentication
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Authorization check (Admin/SuperAdmin only)
  const role = await getUserRole(supabase, user.id);
  if (!role || !['admin', 'super_admin'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 3. Validate ID
    const id = uuidParamSchema.parse(params.id);

    // 4. Verify equipment exists
    const { data: equipment, error: existError } = await supabase
      .from('equipment')
      .select('id, is_archived')
      .eq('id', id)
      .single();

    if (existError || !equipment) {
      return new Response(
        JSON.stringify({ error: 'Equipment not found', code: 'EQUIPMENT_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (equipment.is_archived) {
      return new Response(
        JSON.stringify({
          error: 'Equipment is already archived',
          code: 'ALREADY_ARCHIVED',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Check for active reservations
    const { data: activeReservations } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('equipment_id', id)
      .in('status', ['PENDING', 'RENTED']);

    if (activeReservations && activeReservations.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot archive equipment with active reservations',
          code: 'ACTIVE_RESERVATIONS',
          details: {
            active_count: activeReservations.length,
            reservation_ids: activeReservations.map((r) => r.id),
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Archive equipment (soft delete)
    const { error: archiveError } = await supabase
      .from('equipment')
      .update({ is_archived: true })
      .eq('id', id);

    if (archiveError) {
      console.error('Equipment archive error:', archiveError);
      return new Response(
        JSON.stringify({ error: 'Failed to archive equipment', code: 'DATABASE_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Return success message
    const response: MessageResponse = {
      message: 'Equipment archived successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid equipment ID',
          code: 'VALIDATION_ERROR',
          details: error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Equipment archive error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
