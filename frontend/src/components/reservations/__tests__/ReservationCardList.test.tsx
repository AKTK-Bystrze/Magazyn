import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationCardList } from "../ReservationCardList";
import type { ReservationListItem } from "@/types";

describe("ReservationCardList", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeItem = (
    id: string,
    status: ReservationListItem["status"],
    userId = "user-1"
  ): ReservationListItem => ({
    id,
    userId,
    username: "testuser",
    equipmentId: `eq-${id}`,
    equipmentName: `Sprzęt ${id}`,
    equipmentType: "Kajaki",
    status,
    startDate: "2026-05-10T10:00:00Z",
    endDate: "2026-05-12T18:00:00Z",
    creditCost: 30,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: null,
  });

  it("passes only returnable items (PENDING, RENTED) to onReturnAll when group is clicked", () => {
    const onReturnAll = vi.fn();
    const items = [makeItem("1", "PENDING"), makeItem("2", "RENTED"), makeItem("3", "RETURNED")];

    render(
      <ReservationCardList
        reservations={items}
        isLoading={false}
        mode="user"
        scope="my"
        currentUserId="user-1"
        fetchNextPage={vi.fn()}
        hasNextPage={false}
        isFetchingNextPage={false}
        onReturnAll={onReturnAll}
      />
    );

    // Expand the grouped card
    const header = screen.getByText("testuser");
    fireEvent.click(header);

    // Click "Zwróć Wszystkie"
    const returnAllBtn = screen.getByTestId("return-all-button");
    expect(returnAllBtn).toBeInTheDocument();
    fireEvent.click(returnAllBtn);

    expect(onReturnAll).toHaveBeenCalledTimes(1);
    const calledWith = onReturnAll.mock.calls[0][0];
    expect(calledWith).toHaveLength(2);
    expect(calledWith.map((i: ReservationListItem) => i.id)).toEqual(["1", "2"]);
  });
});
