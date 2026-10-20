import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReservationHistorySection } from "../ReservationHistorySection";
import type { EquipmentReservationHistoryItem } from "@/types";

describe("ReservationHistorySection", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders empty state message when reservations list is empty", () => {
    render(<ReservationHistorySection reservations={[]} />);
    expect(screen.getByText(/brak rezerwacji/i)).toBeInTheDocument();
  });

  it("renders overdue pending reservation with 'Zaległa' badge", () => {
    const reservations: EquipmentReservationHistoryItem[] = [
      {
        id: "res-overdue-1",
        userId: "user-1",
        username: "jan.kowalski",
        startDate: "2026-04-10T10:00:00Z",
        endDate: "2026-04-15T18:00:00Z",
        status: "PENDING",
        creditCost: 20,
        createdAt: "2026-04-01T12:00:00Z",
      },
    ];

    render(<ReservationHistorySection reservations={reservations} />);
    expect(screen.getByText("jan.kowalski")).toBeInTheDocument();
    expect(screen.getByText("Zaległa")).toBeInTheDocument();
    expect(screen.getByText(/20 credits/i)).toBeInTheDocument();
  });

  it("renders future pending reservation with 'Przyszła' badge", () => {
    const reservations: EquipmentReservationHistoryItem[] = [
      {
        id: "res-future-1",
        userId: "user-2",
        username: "anna.nowak",
        startDate: "2026-05-10T10:00:00Z",
        endDate: "2026-05-15T18:00:00Z",
        status: "PENDING",
        creditCost: 25,
        createdAt: "2026-05-01T10:00:00Z",
      },
    ];

    render(<ReservationHistorySection reservations={reservations} />);
    expect(screen.getByText("anna.nowak")).toBeInTheDocument();
    expect(screen.getByText("Przyszła")).toBeInTheDocument();
  });
});
