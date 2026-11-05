import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationDetailsView } from "../ReservationDetailsView";

vi.mock("@/hooks/useReservationDetail", () => ({
  useReservationDetail: vi.fn(),
}));

import { useReservationDetail } from "@/hooks/useReservationDetail";

describe("ReservationDetailsView", () => {
  const mockReservation = {
    id: "res-123",
    userId: "user-1",
    username: "Test User",
    userEmail: "test@example.com",
    equipmentId: "eq-1",
    equipmentName: "Kajak Górski",
    equipmentType: "Kajaki",
    equipmentInternalId: "KG-01",
    status: "PENDING" as const,
    startDate: "2026-06-01T10:00:00Z",
    endDate: "2026-06-05T18:00:00Z",
    creditCost: 40,
    createdAt: "2026-05-01T10:00:00Z",
    auditTrail: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links back to /admin/reservations when isAdmin is true", () => {
    vi.mocked(useReservationDetail).mockReturnValue({
      reservation: mockReservation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updateStatus: vi.fn(),
      isUpdating: false,
    });

    render(
      <ReservationDetailsView
        reservationId="res-123"
        currentUserId="user-1"
        currentUserBalance={100}
        isAdmin={true}
      />
    );

    const backLink = screen.getByRole("link", { name: /powrót do rezerwacji/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/admin/reservations");
  });

  it("links back to /reservations when isAdmin is false", () => {
    vi.mocked(useReservationDetail).mockReturnValue({
      reservation: mockReservation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updateStatus: vi.fn(),
      isUpdating: false,
    });

    render(
      <ReservationDetailsView
        reservationId="res-123"
        currentUserId="user-1"
        currentUserBalance={100}
        isAdmin={false}
      />
    );

    const backLink = screen.getByRole("link", { name: /powrót do rezerwacji/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/reservations");
  });

  it("calls window.history.back() when referrer contains /reservations", () => {
    vi.mocked(useReservationDetail).mockReturnValue({
      reservation: mockReservation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updateStatus: vi.fn(),
      isUpdating: false,
    });

    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    Object.defineProperty(document, "referrer", {
      value: "http://localhost:3000/admin/reservations?scope=all",
      configurable: true,
    });
    Object.defineProperty(window.history, "length", {
      value: 2,
      configurable: true,
    });

    render(
      <ReservationDetailsView
        reservationId="res-123"
        currentUserId="user-1"
        currentUserBalance={100}
        isAdmin={true}
      />
    );

    const backLink = screen.getByRole("link", { name: /powrót do rezerwacji/i });
    fireEvent.click(backLink);

    expect(backSpy).toHaveBeenCalled();
  });
});
