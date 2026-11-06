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
    vi.mocked(useReservationDetail).mockReturnValue({
      reservation: mockReservation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updateStatus: vi.fn(),
      isUpdating: false,
    });
  });

  it("links back to /admin/reservations when isAdmin is true", () => {
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

  it("calls window.history.back() when referrer is from same origin", () => {
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

  it("renders reservation details, reserver info, and no status actions for non-owner regular user", () => {
    render(
      <ReservationDetailsView
        reservationId="res-123"
        currentUserId="other-user-456"
        currentUserBalance={100}
        isAdmin={false}
      />
    );

    // Equipment and reservation info
    expect(screen.getByText("Kajak Górski")).toBeInTheDocument();
    expect(screen.getByText(/Kajaki • KG-01/i)).toBeInTheDocument();
    expect(screen.getByText("40 godzinki")).toBeInTheDocument();

    // Reserver info is displayed for non-owners
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    // No status change action buttons should be rendered
    expect(screen.queryByTestId("rent-reservation-button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^anuluj$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^zmień termin$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^zwróć$/i })).not.toBeInTheDocument();
  });

  it("renders status actions and hides user card for owner", () => {
    render(
      <ReservationDetailsView
        reservationId="res-123"
        currentUserId="user-1"
        currentUserBalance={100}
        isAdmin={false}
      />
    );

    // Equipment info
    expect(screen.getByText("Kajak Górski")).toBeInTheDocument();

    // User card is not shown for the owner
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
    expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();

    // Owner action buttons are rendered for PENDING reservation
    expect(screen.getByTestId("rent-reservation-button")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /odbierz/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^anuluj$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^zmień termin$/i })).toBeInTheDocument();
  });

  it("renders reserver info and admin status actions for non-owner admin", () => {
    render(
      <ReservationDetailsView
        reservationId="res-123"
        currentUserId="admin-user-789"
        currentUserBalance={100}
        isAdmin={true}
      />
    );

    // Reserver info is displayed
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    // Admin action buttons are rendered
    expect(screen.getByTestId("rent-reservation-button")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wydaj/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^anuluj$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^zmień termin$/i })).toBeInTheDocument();
  });
});
