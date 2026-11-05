import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GroupedReservationCard } from "../GroupedReservationCard";
import type { GroupedReservation, ReservationListItem } from "@/types";

describe("GroupedReservationCard", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
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

  const makeGroup = (
    status: GroupedReservation["status"],
    items: ReservationListItem[],
    userId = "user-1"
  ): GroupedReservation => ({
    groupKey: `${userId}-2026-05-10-2026-05-12`,
    userId,
    username: "testuser",
    startDate: "2026-05-10T10:00:00Z",
    endDate: "2026-05-12T18:00:00Z",
    status,
    totalCreditCost: items.reduce((sum, i) => sum + i.creditCost, 0),
    items,
    createdAt: "2026-05-01T12:00:00Z",
  });

  it("renders 'Zwróć Wszystkie' when group is PENDING and expanded for owner", () => {
    const onReturnAll = vi.fn();
    const items = [makeItem("1", "PENDING"), makeItem("2", "PENDING")];
    const group = makeGroup("PENDING", items);

    render(
      <GroupedReservationCard
        group={group}
        isExpanded={true}
        scope="my"
        currentUserId="user-1"
        mode="user"
        onToggle={vi.fn()}
        onCancelAll={vi.fn()}
        onModifyDatesAll={vi.fn()}
        onReturnAll={onReturnAll}
      />
    );

    const returnBtn = screen.getByTestId("return-all-button");
    expect(returnBtn).toBeInTheDocument();
    expect(returnBtn).toHaveTextContent("Zwróć Wszystkie");

    fireEvent.click(returnBtn);
    expect(onReturnAll).toHaveBeenCalledTimes(1);
  });

  it("renders 'Zwróć Wszystkie' when group is RENTED and expanded for owner", () => {
    const onReturnAll = vi.fn();
    const items = [makeItem("1", "RENTED"), makeItem("2", "RENTED")];
    const group = makeGroup("RENTED", items);

    render(
      <GroupedReservationCard
        group={group}
        isExpanded={true}
        scope="my"
        currentUserId="user-1"
        mode="user"
        onToggle={vi.fn()}
        onCancelAll={vi.fn()}
        onModifyDatesAll={vi.fn()}
        onReturnAll={onReturnAll}
      />
    );

    const returnBtn = screen.getByTestId("return-all-button");
    expect(returnBtn).toBeInTheDocument();

    fireEvent.click(returnBtn);
    expect(onReturnAll).toHaveBeenCalledTimes(1);
  });

  it("renders 'Zwróć Wszystkie' for owner when scope is all", () => {
    const items = [makeItem("1", "PENDING"), makeItem("2", "RENTED")];
    const group = makeGroup("MIXED", items);

    render(
      <GroupedReservationCard
        group={group}
        isExpanded={true}
        scope="all"
        currentUserId="user-1"
        mode="user"
        onToggle={vi.fn()}
        onCancelAll={vi.fn()}
        onModifyDatesAll={vi.fn()}
        onReturnAll={vi.fn()}
      />
    );

    expect(screen.getByTestId("return-all-button")).toBeInTheDocument();
  });

  it("renders 'Zwróć Wszystkie' for admin even if reservation belongs to another user", () => {
    const items = [makeItem("1", "RENTED", "user-other"), makeItem("2", "RENTED", "user-other")];
    const group = makeGroup("RENTED", items, "user-other");

    render(
      <GroupedReservationCard
        group={group}
        isExpanded={true}
        scope="all"
        currentUserId="admin-user"
        mode="admin"
        onToggle={vi.fn()}
        onCancelAll={vi.fn()}
        onModifyDatesAll={vi.fn()}
        onReturnAll={vi.fn()}
      />
    );

    expect(screen.getByTestId("return-all-button")).toBeInTheDocument();
  });

  it("does not render action toolbar when user is not owner and not admin", () => {
    const items = [makeItem("1", "RENTED", "user-other"), makeItem("2", "RENTED", "user-other")];
    const group = makeGroup("RENTED", items, "user-other");

    render(
      <GroupedReservationCard
        group={group}
        isExpanded={true}
        scope="all"
        currentUserId="user-1"
        mode="user"
        onToggle={vi.fn()}
        onCancelAll={vi.fn()}
        onModifyDatesAll={vi.fn()}
        onReturnAll={vi.fn()}
      />
    );

    expect(screen.queryByTestId("return-all-button")).not.toBeInTheDocument();
  });

  it("does not render 'Zwróć Wszystkie' when all items are RETURNED or CANCELLED", () => {
    const items = [makeItem("1", "RETURNED"), makeItem("2", "CANCELLED")];
    const group = makeGroup("MIXED", items);

    render(
      <GroupedReservationCard
        group={group}
        isExpanded={true}
        scope="my"
        currentUserId="user-1"
        mode="user"
        onToggle={vi.fn()}
        onCancelAll={vi.fn()}
        onModifyDatesAll={vi.fn()}
        onReturnAll={vi.fn()}
      />
    );

    expect(screen.queryByTestId("return-all-button")).not.toBeInTheDocument();
  });
});
