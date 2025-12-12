import type { ReservationListItem, GroupedReservation } from "@/types";

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
  // Create a map to group reservations
  const groupMap = new Map<string, ReservationListItem[]>();

  for (const reservation of reservations) {
    const groupKey = `${reservation.userId}-${reservation.startDate}-${reservation.endDate}`;
    
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    
    groupMap.get(groupKey)!.push(reservation);
  }

  // Convert map to array of grouped reservations
  const groups: GroupedReservation[] = [];

  for (const [groupKey, items] of groupMap.entries()) {
    // Calculate total credit cost
    const totalCreditCost = items.reduce((sum, item) => sum + item.creditCost, 0);

    // Determine aggregate status
    const statuses = new Set(items.map((item) => item.status));
    const status = statuses.size === 1 ? items[0].status : "MIXED";

    // Find earliest createdAt
    const createdAt = items
      .map((item) => item.createdAt)
      .sort()[0];

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

  // Sort by createdAt descending (most recent first)
  return groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
