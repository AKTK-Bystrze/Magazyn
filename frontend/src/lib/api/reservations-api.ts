import { api } from "./client";
import type {
  ReservationFilterState,
  ReservationListResponse,
  ReservationDetail,
  UpdateReservationCommand,
  UpdateReservationResponse,
  BulkUpdateReservationsCommand,
  BulkUpdateReservationsResponse,
} from "@/types";
import {
  transformReservationListResponse,
  transformReservationDetail,
  transformUpdateReservationCommand,
} from "@/lib/transformers/reservation.transformer";

/**
 * API client for reservation endpoints
 * Handles data transformation between frontend (camelCase) and backend (snake_case)
 */
export const reservationsApi = {
  /**
   * Fetches paginated list of reservations
   * User sees own reservations, admin sees all
   *
   * @param filters - Filter and pagination options
   * @returns Paginated reservation list
   */
  list: async (
    filters: Partial<ReservationFilterState>
  ): Promise<ReservationListResponse> => {
    const params: Record<string, string | number | undefined> = {
      page: filters.page,
      per_page: filters.perPage,
      sort: filters.sort,
    };

    // Only add status if not 'ALL'
    if (filters.status && filters.status !== "ALL") {
      params.status = filters.status;
    }

    if (filters.query) {
      params.search = filters.query;
    }

    const { data } = await api.get<unknown>("/api/reservations", params);
    return transformReservationListResponse(data);
  },

  /**
   * Fetches detailed reservation with audit trail
   *
   * @param id - Reservation ID
   * @returns Full reservation details including audit trail
   */
  getById: async (id: string): Promise<ReservationDetail> => {
    const { data } = await api.get<unknown>(`/api/reservations/${id}`);
    return transformReservationDetail(data);
  },

  /**
   * Updates a reservation (dates or status)
   *
   * @param id - Reservation ID
   * @param command - Update command with new values
   * @returns Updated reservation with credit adjustment info
   */
  update: async (
    id: string,
    command: UpdateReservationCommand
  ): Promise<UpdateReservationResponse> => {
    const body = transformUpdateReservationCommand(command);
    const { data } = await api.patch<UpdateReservationResponse>(
      `/api/reservations/${id}`,
      body
    );
    return data;
  },

  /**
   * Cancels a reservation (user action)
   * Sets status to DENIED and triggers refund
   *
   * @param id - Reservation ID
   * @returns Updated reservation with refund info
   */
  cancel: async (id: string): Promise<UpdateReservationResponse> => {
    return reservationsApi.update(id, { status: "DENIED" });
  },

  /**
   * Bulk update reservation statuses (admin only)
   *
   * @param command - Bulk update command
   * @returns Summary of successful and failed updates
   */
  bulkUpdate: async (
    command: BulkUpdateReservationsCommand
  ): Promise<BulkUpdateReservationsResponse> => {
    const body = {
      reservation_ids: command.reservationIds,
      status: command.status,
    };
    const { data } = await api.patch<BulkUpdateReservationsResponse>(
      "/api/reservations/bulk",
      body
    );
    return data;
  },
};
