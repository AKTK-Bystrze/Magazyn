import type { ReservationListItem, GroupedReservation } from "@/types";
import { MIXED_STATUS } from "@/lib/config/constants";

/**
 * Groups reservations by user ID and date range.
 * Reservations with the same userId, startDate, and endDate are collapsed into a single group.
 *
 * @param reservations - Flat list of reservation items
 * @returns Array of grouped reservations
 */
export function groupReservationsByDateRange(
  reservations: ReservationListItem[]
): GroupedReservation[] {
  const groupMap = new Map<string, ReservationListItem[]>();

  for (const reservation of reservations) {
    const groupKey = `${reservation.userId}-${reservation.startDate}-${reservation.endDate}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }

    groupMap.get(groupKey)!.push(reservation);
  }

  const groups: GroupedReservation[] = [];

  for (const [groupKey, items] of groupMap.entries()) {
    const totalCreditCost = items.reduce((sum, item) => sum + item.creditCost, 0);

    const statuses = new Set(items.map((item) => item.status));
    const status = statuses.size === 1 ? items[0].status : MIXED_STATUS;

    const createdAt = items.map((item) => item.createdAt).sort()[0];

    groups.push({
      groupKey,
      userId: items[0].userId,
      username: items[0].username,
      startDate: items[0].startDate,
      endDate: items[0].endDate,
      status,
      totalCreditCost,
      items,
      createdAt,
    });
  }

  return groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
