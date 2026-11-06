import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartAvailabilityAlerts } from "../CartAvailabilityAlerts";
import type { AvailabilityCheckResult } from "@/types/reservation-cart.types";

describe("CartAvailabilityAlerts", () => {
  beforeEach(() => {
    // Mock scrollIntoView for jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  const availableResult: AvailabilityCheckResult = {
    isAllAvailable: true,
    unavailableItems: [],
  };

  it("renders empty element when there are no errors and items are available", () => {
    const { container } = render(
      <CartAvailabilityAlerts submissionError={null} availabilityResult={availableResult} />
    );

    expect(screen.queryByText("Rezerwacja Nie Powiodła Się")).not.toBeInTheDocument();
    expect(screen.queryByText("Wykryto Problemy z Dostępnością")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("renders submission error alert when submissionError is provided", () => {
    render(
      <CartAvailabilityAlerts
        submissionError="Brak wystarczających środków na koncie"
        availabilityResult={availableResult}
      />
    );

    expect(screen.getByText("Rezerwacja Nie Powiodła Się")).toBeInTheDocument();
    expect(screen.getByText("Brak wystarczających środków na koncie")).toBeInTheDocument();
  });

  it("renders availability conflicts with item names, reasons, date ranges, owner, and links", () => {
    const conflictResult: AvailabilityCheckResult = {
      isAllAvailable: false,
      unavailableItems: [
        {
          equipmentId: "eq-1",
          name: "Wiosło Górskie",
          reason: "Sprzęt zarezerwowany w wybranym terminie",
          conflictingReservations: [
            {
              id: "res-123",
              startDate: "2026-05-10",
              endDate: "2026-05-12",
              username: "jan.kowalski",
            },
          ],
        },
      ],
    };

    render(
      <CartAvailabilityAlerts
        submissionError={null}
        availabilityResult={conflictResult}
        equipmentBrowsePath="/equipment"
        isAdmin={true}
      />
    );

    expect(screen.getByTestId("error-reservation-conflict")).toBeInTheDocument();
    expect(screen.getByText("Wykryto Problemy z Dostępnością")).toBeInTheDocument();
    const equipLink = screen.getByRole("link", { name: "Wiosło Górskie" });
    expect(equipLink).toHaveAttribute("href", "/equipment/eq-1");
    expect(screen.getByText(/Sprzęt zarezerwowany w wybranym terminie/)).toBeInTheDocument();
    expect(screen.getByText(/2026-05-10 do 2026-05-12/)).toBeInTheDocument();
    expect(screen.getByText("jan.kowalski")).toBeInTheDocument();
    const detailsLink = screen.getByRole("link", { name: "Szczegóły" });
    expect(detailsLink).toHaveAttribute("href", "/reservations/res-123");
    const backLink = screen.getByRole("link", { name: "← Wróć do listy sprzętu" });
    expect(backLink).toHaveAttribute("href", "/equipment");
  });

  it("renders details link for non-admin user even when conflict belongs to another user", () => {
    const conflictResult: AvailabilityCheckResult = {
      isAllAvailable: false,
      unavailableItems: [
        {
          equipmentId: "eq-1",
          name: "Wiosło Górskie",
          reason: "Sprzęt zarezerwowany w wybranym terminie",
          conflictingReservations: [
            {
              id: "res-123",
              startDate: "2026-05-10",
              endDate: "2026-05-12",
              userId: "other-user",
              username: "jan.kowalski",
            },
          ],
        },
      ],
    };

    render(<CartAvailabilityAlerts submissionError={null} availabilityResult={conflictResult} />);

    expect(screen.getByRole("link", { name: "Szczegóły" })).toHaveAttribute(
      "href",
      "/reservations/res-123"
    );
    expect(screen.getByText("jan.kowalski")).toBeInTheDocument();
  });

  it("renders both submission error and conflict alert when both are present", () => {
    const conflictResult: AvailabilityCheckResult = {
      isAllAvailable: false,
      unavailableItems: [
        {
          equipmentId: "eq-2",
          name: "Kask",
          reason: "Przedmiot uszkodzony",
          conflictingReservations: [],
        },
      ],
    };

    render(
      <CartAvailabilityAlerts
        submissionError="Błąd serwera podczas przetwarzania"
        availabilityResult={conflictResult}
      />
    );

    expect(screen.getByText("Rezerwacja Nie Powiodła Się")).toBeInTheDocument();
    expect(screen.getByText("Błąd serwera podczas przetwarzania")).toBeInTheDocument();
    expect(screen.getByTestId("error-reservation-conflict")).toBeInTheDocument();
    expect(screen.getByText("Kask")).toBeInTheDocument();
  });
});
