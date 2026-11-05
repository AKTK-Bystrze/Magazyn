import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EquipmentDetailsView } from "../EquipmentDetailsView";
import { useEquipmentDetails } from "@/hooks/useEquipmentDetails";

vi.mock("@/hooks/useEquipmentDetails");

describe("EquipmentDetailsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    vi.mocked(useEquipmentDetails).mockReturnValue({
      equipment: undefined,
      maintenanceLogs: [],
      reservationHistory: [],
      isLoading: true,
      isLogsLoading: false,
      isReservationsLoading: false,
      error: null,
      addMaintenanceLog: vi.fn(),
      isMutating: false,
      refetch: vi.fn(),
    });

    const { container } = render(<EquipmentDetailsView equipmentId="eq-1" />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders error state when equipment is not found", () => {
    vi.mocked(useEquipmentDetails).mockReturnValue({
      equipment: undefined,
      maintenanceLogs: [],
      reservationHistory: [],
      isLoading: false,
      isLogsLoading: false,
      isReservationsLoading: false,
      error: new Error("Not found"),
      addMaintenanceLog: vi.fn(),
      isMutating: false,
      refetch: vi.fn(),
    });

    render(<EquipmentDetailsView equipmentId="eq-1" />);
    expect(
      screen.getByText(/Nie znaleziono sprzętu lub wystąpił błąd ładowania/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Powrót do sprzętu/ })).toHaveAttribute(
      "href",
      "/equipment"
    );
  });

  it("renders equipment details with back link and history", () => {
    vi.mocked(useEquipmentDetails).mockReturnValue({
      equipment: {
        id: "eq-1",
        internalId: "EQ-001",
        typeId: "typ-1",
        name: "Kajak Górski Rapid",
        description: "Wytrzymały kajak górski",
        status: "ok",
        isArchived: false,
        createdAt: "2026-01-01",
        updatedAt: null,
        type: {
          id: "typ-1",
          name: "Kajaki",
          creditCostPerDay: 5,
        },
      },
      maintenanceLogs: [],
      reservationHistory: [
        {
          id: "res-1",
          userId: "user-1",
          username: "jan.kowalski",
          startDate: "2026-05-01",
          endDate: "2026-05-03",
          status: "RENTED",
          creditCost: 15,
          createdAt: "2026-04-20",
        },
      ],
      isLoading: false,
      isLogsLoading: false,
      isReservationsLoading: false,
      error: null,
      addMaintenanceLog: vi.fn(),
      isMutating: false,
      refetch: vi.fn(),
    });

    render(<EquipmentDetailsView equipmentId="eq-1" isAdmin={false} />);
    expect(screen.getByText("Kajak Górski Rapid")).toBeInTheDocument();
    expect(screen.getByText("EQ-001 • Kajaki")).toBeInTheDocument();
    expect(screen.getByText("Wytrzymały kajak górski")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Powrót do sprzętu/ })).toHaveAttribute(
      "href",
      "/equipment"
    );
    expect(screen.getByRole("link", { name: /01.05.2026 → 03.05.2026/ })).toHaveAttribute(
      "href",
      "/reservations/res-1"
    );
  });

  it("renders admin back link to admin equipment", () => {
    vi.mocked(useEquipmentDetails).mockReturnValue({
      equipment: {
        id: "eq-1",
        internalId: "EQ-001",
        typeId: "typ-1",
        name: "Kajak Górski Rapid",
        description: "Wytrzymały kajak górski",
        status: "ok",
        isArchived: false,
        createdAt: "2026-01-01",
        updatedAt: null,
        type: {
          id: "typ-1",
          name: "Kajaki",
          creditCostPerDay: 5,
        },
      },
      maintenanceLogs: [],
      reservationHistory: [],
      isLoading: false,
      isLogsLoading: false,
      isReservationsLoading: false,
      error: null,
      addMaintenanceLog: vi.fn(),
      isMutating: false,
      refetch: vi.fn(),
    });

    render(<EquipmentDetailsView equipmentId="eq-1" isAdmin={true} />);
    expect(screen.getByRole("link", { name: /Powrót do sprzętu/ })).toHaveAttribute(
      "href",
      "/admin/equipment"
    );
  });
});
