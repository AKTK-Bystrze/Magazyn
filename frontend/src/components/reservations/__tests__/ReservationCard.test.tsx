import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReservationCard } from "../ReservationCard";
import type { ReservationListItem } from "@/types";

describe("ReservationCard", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockReservation: ReservationListItem = {
    id: "res-101",
    userId: "user-1",
    username: "testuser",
    equipmentId: "eq-1",
    equipmentName: "Kajak Górski",
    equipmentType: "Kajaki",
    status: "PENDING",
    startDate: "2026-05-10T10:00:00Z",
    endDate: "2026-05-12T18:00:00Z",
    creditCost: 30,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: null,
  };

  it("renders 'Szczegóły' link and no action buttons when user is not owner and not admin", () => {
    render(<ReservationCard reservation={mockReservation} mode="user" isOwn={false} />);

    const detailsLink = screen.getByRole("link", { name: "Szczegóły" });
    expect(detailsLink).toBeInTheDocument();
    expect(detailsLink).toHaveAttribute("href", "/reservations/res-101");
    expect(screen.queryByTestId("cancel-reservation-button")).not.toBeInTheDocument();
  });

  it("renders action buttons when user is owner", () => {
    render(
      <ReservationCard
        reservation={mockReservation}
        mode="user"
        isOwn={true}
        onCancel={vi.fn()}
        onModify={vi.fn()}
        onRent={vi.fn()}
      />
    );

    expect(screen.getByTestId("cancel-reservation-button")).toBeInTheDocument();
    expect(screen.getByTestId("modify-dates-button")).toBeInTheDocument();
    expect(screen.getByTestId("rent-reservation-button")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Szczegóły" })).toBeInTheDocument();
  });

  it("renders 'Odbierz' for user mode and 'Wydaj' for admin mode", () => {
    const { rerender } = render(
      <ReservationCard reservation={mockReservation} mode="user" isOwn={true} onRent={vi.fn()} />
    );
    expect(screen.getByTestId("rent-reservation-button")).toHaveTextContent("Odbierz");

    rerender(
      <ReservationCard reservation={mockReservation} mode="admin" isOwn={false} onRent={vi.fn()} />
    );
    expect(screen.getByTestId("rent-reservation-button")).toHaveTextContent("Wydaj");
  });
});
