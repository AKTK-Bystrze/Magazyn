import { describe, it, expect } from "vitest";
import { groupReservationsByDateRange } from "./group-reservations";
import type { ReservationListItem } from "@/types";

describe("groupReservationsByDateRange", () => {
  const baseItem: ReservationListItem = {
    id: "res-1",
    userId: "user-1",
    username: "testuser",
    equipmentId: "eq-1",
    equipmentName: "Kayak A",
    equipmentType: "kayak",
    startDate: "2026-06-10",
    endDate: "2026-06-15",
    status: "PENDING",
    creditCost: 10,
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: null,
    isFree: false,
  };

  it("groups items with same user and dates", () => {
    const items: ReservationListItem[] = [
      baseItem,
      {
        ...baseItem,
        id: "res-2",
        equipmentId: "eq-2",
        equipmentName: "Paddle B",
        creditCost: 5,
        createdAt: "2026-05-01T10:05:00Z",
      },
    ];

    const groups = groupReservationsByDateRange(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].totalCreditCost).toBe(15);
  });

  it("sorts groups by created_desc by default", () => {
    const items: ReservationListItem[] = [
      {
        ...baseItem,
        id: "res-1",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        createdAt: "2026-05-01T10:00:00Z",
      },
      {
        ...baseItem,
        id: "res-2",
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        createdAt: "2026-05-10T10:00:00Z",
      },
    ];

    const groups = groupReservationsByDateRange(items, "created_desc");
    expect(groups[0].items[0].id).toBe("res-2");
    expect(groups[1].items[0].id).toBe("res-1");
  });

  it("sorts groups by created_asc", () => {
    const items: ReservationListItem[] = [
      {
        ...baseItem,
        id: "res-1",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        createdAt: "2026-05-01T10:00:00Z",
      },
      {
        ...baseItem,
        id: "res-2",
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        createdAt: "2026-05-10T10:00:00Z",
      },
    ];

    const groups = groupReservationsByDateRange(items, "created_asc");
    expect(groups[0].items[0].id).toBe("res-1");
    expect(groups[1].items[0].id).toBe("res-2");
  });

  it("sorts groups by start_date_asc and start_date_desc", () => {
    const items: ReservationListItem[] = [
      {
        ...baseItem,
        id: "res-early",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
      },
      {
        ...baseItem,
        id: "res-late",
        startDate: "2026-08-01",
        endDate: "2026-08-10",
      },
    ];

    const ascGroups = groupReservationsByDateRange(items, "start_date_asc");
    expect(ascGroups[0].items[0].id).toBe("res-early");
    expect(ascGroups[1].items[0].id).toBe("res-late");

    const descGroups = groupReservationsByDateRange(items, "start_date_desc");
    expect(descGroups[0].items[0].id).toBe("res-late");
    expect(descGroups[1].items[0].id).toBe("res-early");
  });

  it("sorts groups by end_date_asc and end_date_desc", () => {
    const items: ReservationListItem[] = [
      {
        ...baseItem,
        id: "res-early-end",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
      },
      {
        ...baseItem,
        id: "res-late-end",
        startDate: "2026-06-01",
        endDate: "2026-06-25",
      },
    ];

    const ascGroups = groupReservationsByDateRange(items, "end_date_asc");
    expect(ascGroups[0].items[0].id).toBe("res-early-end");
    expect(ascGroups[1].items[0].id).toBe("res-late-end");

    const descGroups = groupReservationsByDateRange(items, "end_date_desc");
    expect(descGroups[0].items[0].id).toBe("res-late-end");
    expect(descGroups[1].items[0].id).toBe("res-early-end");
  });
});
