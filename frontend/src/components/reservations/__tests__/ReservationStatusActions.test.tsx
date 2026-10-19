import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReservationStatusActions } from "../ReservationStatusActions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReservationDetail } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe("ReservationStatusActions", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  const mockReservation: ReservationDetail = {
    id: "res-1",
    userId: "user-1",
    userEmail: "test@example.com",
    username: "testuser",
    equipmentId: "eq-1",
    equipmentName: "Kajak",
    equipmentType: "Kajaki",
    equipmentInternalId: "KAJ-001",
    startDate: "2026-05-10T10:00:00Z",
    endDate: "2026-05-15T18:00:00Z",
    status: "PENDING",
    creditCost: 30,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: null,
    auditTrail: [],
  };

  it("renders unified concise action buttons without redundant status dropdown", () => {
    renderWithQuery(
      <ReservationStatusActions
        reservation={mockReservation}
        currentUserId="user-1"
        currentUserBalance={100}
        isAdmin={true}
        onStatusChange={vi.fn()}
        isUpdating={false}
      />
    );

    expect(screen.getByRole("button", { name: /Zmień termin/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anuluj/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zwróć/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Zmień Status/i })).not.toBeInTheDocument();
  });
});
