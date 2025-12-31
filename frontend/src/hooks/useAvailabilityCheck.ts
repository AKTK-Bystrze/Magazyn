import { useState, useCallback } from "react";
import type {
  CartItem,
  AvailabilityCheckResult,
} from "@/types/reservation-cart.types";
import {
  ERROR_AVAILABILITY_CHECK_FAILED,
  ERROR_UNAVAILABLE_FOR_DATES,
} from "@/lib/config/constants";
import { transformEquipmentAvailabilityDTO } from "@/lib/transformers/availability.transformer";
import { debug } from "@/lib/utils/debug";
import { supabase } from "@/lib/supabase";

/**
 * Custom hook for checking equipment availability for cart items
 * Performs parallel availability checks for all items
 *
 * @param items - Cart items to check
 * @param startDate - Start date for availability check
 * @param endDate - End date for availability check
 * @returns Availability check function and loading state
 */
export function useAvailabilityCheck(
  items: CartItem[],
  startDate: string | null,
  endDate: string | null
) {
  const [isChecking, setIsChecking] = useState(false);

  const checkAvailability = useCallback(async (): Promise<AvailabilityCheckResult> => {
    if (!startDate || !endDate || items.length === 0) {
      return {
        isAllAvailable: true,
        unavailableItems: [],
      };
    }

    setIsChecking(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      const availabilityChecks = items.map(async (item) => {
        try {
          const response = await fetch(
            `/api/equipment/${item.equipmentId}/availability?${params}`,
            { headers }
          );

          if (!response.ok) {
            // Log the status text for debugging
            debug.error('Availability', `Check failed for ${item.name}: ${response.status} ${response.statusText}`);
            throw new Error(ERROR_AVAILABILITY_CHECK_FAILED);
          }

          const rawData = await response.json();
          debug.log('Availability', `${item.name} (raw):`, rawData);

          // Transform using availability transformer
          const data = transformEquipmentAvailabilityDTO(rawData);
          debug.log('Availability', `${item.name} (transformed):`, data);

          return { item, availability: data };
        } catch (error) {
          debug.error('Availability', `Failed to check availability for ${item.name}:`, error);
          return {
            item,
            availability: {
              equipmentId: item.equipmentId,
              isAvailable: false,
              conflictingReservations: [],
            },
          };
        }
      });

      const results = await Promise.all(availabilityChecks);

      const unavailableItems = results
        .filter((r) => !r.availability.isAvailable)
        .map((r) => ({
          equipmentId: r.item.equipmentId,
          name: r.item.name,
          reason: ERROR_UNAVAILABLE_FOR_DATES,
          conflictingReservations: (r.availability.conflictingReservations || []).map(
            (reservation) => ({
              startDate: reservation.startDate,
              endDate: reservation.endDate,
            })
          ),
        }));

      return {
        isAllAvailable: unavailableItems.length === 0,
        unavailableItems,
      };
    } finally {
      setIsChecking(false);
    }
  }, [items, startDate, endDate]);

  return {
    checkAvailability,
    isChecking,
  };
}
