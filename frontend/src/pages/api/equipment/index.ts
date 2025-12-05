import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  equipmentListQuerySchema,
  createEquipmentSchema,
  type EquipmentDTO,
  type EquipmentListResponse,
} from '../../../lib/schemas/equipment.schema';
import type { SupabaseClient } from '../../../db/supabase.client';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get user from Supabase session
 */
async function getAuthenticatedUser(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  return session.user;
}

/**
 * Get user role from profiles table
 */
async function getUserRole(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data.role;
}

/**
 * Generate public URL for image path
 */
function generateImageURL(supabase: SupabaseClient, imagePath: string | null): string | null {
  if (!imagePath) return null;

  const { data } = supabase.storage.from('equipment').getPublicUrl(imagePath);
  return data.publicUrl;
}

/**
 * Calculate user's favorite equipment (simplified - top 3 most rented)
 */
async function getUserFavorites(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('reservations')
    .select('equipment_id')
    .eq('user_id', userId)
    .in('status', ['RENTED', 'RETURNED']);

  if (error || !data) return new Set();

  // Count occurrences
  const counts: Record<string, number> = {};
  data.forEach((r) => {
    counts[r.equipment_id] = (counts[r.equipment_id] || 0) + 1;
  });

  // Get top 3
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => id);

  return new Set(sorted);
}

// =============================================================================
// GET /api/equipment - List Equipment
// =============================================================================

export const GET: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  // 1. Authentication check
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const validated = equipmentListQuerySchema.parse(queryParams);

    // 3. Build query with filters
    let query = supabase
      .from('equipment')
      .select('*, equipment_types!inner(name, credit_cost_per_day)', { count: 'exact' });

    // Apply filters
    if (!validated.include_archived) {
      query = query.eq('is_archived', false);
    }

    if (validated.type_id) {
      query = query.eq('type_id', validated.type_id);
    }

    if (validated.status) {
      query = query.eq('status', validated.status);
    }

    if (validated.search) {
      query = query.or(`name.ilike.%${validated.search}%,description.ilike.%${validated.search}%`);
    }

    // Get total count
    const { count: totalItems } = await query;

    // Apply pagination
    const offset = (validated.page - 1) * validated.per_page;
    query = query.range(offset, offset + validated.per_page - 1).order('name', { ascending: true });

    // Execute query
    const { data: equipmentList, error } = await query;

    if (error) {
      console.error('Equipment query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch equipment', code: 'DATABASE_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Calculate favorites
    const favorites = await getUserFavorites(supabase, user.id);

    // 5. Transform to DTOs
    const equipment: EquipmentDTO[] = (equipmentList || []).map((eq: any) => {
      const isFavorite = favorites.has(eq.id);
      return {
        id: eq.id,
        internal_id: eq.internal_id,
        type_id: eq.type_id,
        type_name: eq.equipment_types.name,
        name: eq.name,
        description: eq.description,
        status: eq.status,
        credit_cost_per_day: eq.equipment_types.credit_cost_per_day,
        image_url: generateImageURL(supabase, eq.image_path),
        is_favorite: isFavorite,
        is_archived: eq.is_archived,
        created_at: eq.created_at,
        updated_at: eq.updated_at,
      };
    });

    // 6. Build response with pagination
    const totalPages = Math.ceil((totalItems || 0) / validated.per_page);
    const response: EquipmentListResponse = {
      equipment,
      pagination: {
        page: validated.page,
        per_page: validated.per_page,
        total_items: totalItems || 0,
        total_pages: totalPages,
      },
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

    console.error('Equipment list error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// =============================================================================
// POST /api/equipment - Create Equipment
// =============================================================================

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  // 1. Authentication check
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
    // 3. Validate request body
    const body = await request.json();
    const validated = createEquipmentSchema.parse(body);

    // 4. Validate type_id exists
    const { data: equipType, error: typeError } = await supabase
      .from('equipment_types')
      .select('id, name, credit_cost_per_day')
      .eq('id', validated.type_id)
      .single();

    if (typeError || !equipType) {
      return new Response(
        JSON.stringify({
          error: 'Equipment type not found',
          code: 'EQUIPMENT_TYPE_NOT_FOUND',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Check internal_id uniqueness within type
    const { data: existing } = await supabase
      .from('equipment')
      .select('id')
      .eq('type_id', validated.type_id)
      .eq('internal_id', validated.internal_id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: 'Internal ID already exists for this equipment type',
          code: 'DUPLICATE_INTERNAL_ID',
          details: {
            internal_id: validated.internal_id,
            type_id: validated.type_id,
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Insert equipment
    const { data: created, error: insertError } = await supabase
      .from('equipment')
      .insert({
        internal_id: validated.internal_id,
        type_id: validated.type_id,
        name: validated.name || null,
        description: validated.description || null,
        status: validated.status || 'ok',
        image_path: validated.image_path || null,
      })
      .select()
      .single();

    if (insertError || !created) {
      console.error('Equipment insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create equipment', code: 'DATABASE_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Return DTO with type information
    const response: EquipmentDTO = {
      id: created.id,
      internal_id: created.internal_id,
      type_id: created.type_id,
      type_name: equipType.name,
      name: created.name,
      description: created.description,
      status: created.status,
      credit_cost_per_day: equipType.credit_cost_per_day,
      image_url: generateImageURL(supabase, created.image_path),
      is_archived: created.is_archived,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
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

    console.error('Equipment create error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
