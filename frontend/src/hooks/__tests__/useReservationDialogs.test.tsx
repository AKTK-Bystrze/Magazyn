import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useReservationDialogs } from "../useReservationDialogs";
import { createTestQueryClient } from "@/test/test-utils";
import type { ReservationListItem } from "@/types";

vi.mock("@/lib/api/credits-api", () => ({
  creditsApi: {
    getHistory: vi.fn().mockResolvedValue({
      currentBalance: 100,
      history: [],
      pagination: { page: 1, perPage: 10, totalItems: 0, totalPages: 1 },
    }),
  },
}));

const makeItem = (id: string, name = "Kajak"): ReservationListItem => ({
  id,
  userId: "user-1",
  username: "testuser",
  equipmentId: `eq-${id}`,
  equipmentName: name,
  equipmentType: "Kajaki",
  status: "PENDING",
  startDate: "2026-05-10T10:00:00Z",
  endDate: "2026-05-12T18:00:00Z",
  creditCost: 30,
  createdAt: "2026-05-01T12:00:00Z",
  updatedAt: null,
});

describe("useReservationDialogs error & success routing", () => {
  let queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it("handleModifyDatesConfirm: routes 100% failure to setErrorMessage, not setSuccessMessage, and throws", async () => {
    const setSuccessMessage = vi.fn();
    const setErrorMessage = vi.fn();
    const updateReservation = vi.fn().mockRejectedValue(new Error("Termin jest zajęty"));

    const { result } = renderHook(
      () =>
        useReservationDialogs({
          currentUserId: "user-1",
          sessionUserBalance: 100,
          updateReservation,
          cancelReservation: vi.fn(),
          bulkUpdateStatus: vi.fn(),
          setSuccessMessage,
          setErrorMessage,
        }),
      { wrapper }
    );

    const items = [makeItem("res-1"), makeItem("res-2")];
    act(() => {
      result.current.handleModifyDatesAll(items);
    });

    expect(result.current.modifyDialogOpen).toBe(true);

    await expect(
      act(async () => {
        await result.current.handleModifyDatesConfirm("2026-05-11", "2026-05-13");
      })
    ).rejects.toThrow(/Termin jest zajęty/);

    expect(setSuccessMessage).not.toHaveBeenCalled();
    expect(setErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Nie udało się zaktualizować dat")
    );
    // Dialog must stay open on error
    expect(result.current.modifyDialogOpen).toBe(true);
  });

  it("handleModifyDatesConfirm: splits partial failure into successMessage and errorMessage", async () => {
    const setSuccessMessage = vi.fn();
    const setErrorMessage = vi.fn();
    const updateReservation = vi
      .fn()
      .mockResolvedValueOnce({ id: "res-1" })
      .mockRejectedValueOnce(new Error("Brak uprawnień"));

    const { result } = renderHook(
      () =>
        useReservationDialogs({
          currentUserId: "user-1",
          sessionUserBalance: 100,
          updateReservation,
          cancelReservation: vi.fn(),
          bulkUpdateStatus: vi.fn(),
          setSuccessMessage,
          setErrorMessage,
        }),
      { wrapper }
    );

    const items = [makeItem("res-1"), makeItem("res-2")];
    act(() => {
      result.current.handleModifyDatesAll(items);
    });

    await act(async () => {
      await result.current.handleModifyDatesConfirm("2026-05-11", "2026-05-13");
    });

    expect(setSuccessMessage).toHaveBeenCalledWith("1 rezerwacji zaktualizowano pomyślnie.");
    expect(setErrorMessage).toHaveBeenCalledWith("1 rezerwacji nie udało się zaktualizować.");
    expect(result.current.modifyDialogOpen).toBe(false);
  });

  it("handleReturnConfirm: routes 100% failure with date changes to errorMessage and throws", async () => {
    const setSuccessMessage = vi.fn();
    const setErrorMessage = vi.fn();
    const updateReservation = vi.fn().mockRejectedValue(new Error("Błąd bazy danych"));

    const { result } = renderHook(
      () =>
        useReservationDialogs({
          currentUserId: "user-1",
          sessionUserBalance: 100,
          updateReservation,
          cancelReservation: vi.fn(),
          bulkUpdateStatus: vi.fn(),
          setSuccessMessage,
          setErrorMessage,
        }),
      { wrapper }
    );

    const items = [makeItem("res-1"), makeItem("res-2")];
    act(() => {
      result.current.handleReturnAll(items);
    });

    expect(result.current.returnDialogOpen).toBe(true);

    await expect(
      act(async () => {
        await result.current.handleReturnConfirm({
          status: "RETURNED",
          startDate: "2026-05-10",
          endDate: "2026-05-14",
        });
      })
    ).rejects.toThrow();

    expect(setSuccessMessage).not.toHaveBeenCalled();
    expect(setErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Nie udało się zwrócić żadnego")
    );
    expect(result.current.returnDialogOpen).toBe(true);
  });

  it("handleReturnConfirm: bulkUpdateStatus returning 0 updated count routes to errorMessage and throws", async () => {
    const setSuccessMessage = vi.fn();
    const setErrorMessage = vi.fn();
    const bulkUpdateStatus = vi
      .fn()
      .mockResolvedValue({ updated_count: 0, skipped_ids: ["res-1"] });

    const { result } = renderHook(
      () =>
        useReservationDialogs({
          currentUserId: "user-1",
          sessionUserBalance: 100,
          updateReservation: vi.fn(),
          cancelReservation: vi.fn(),
          bulkUpdateStatus,
          setSuccessMessage,
          setErrorMessage,
        }),
      { wrapper }
    );

    const items = [makeItem("res-1"), makeItem("res-2")];
    act(() => {
      result.current.handleReturnAll(items);
    });

    await expect(
      act(async () => {
        await result.current.handleReturnConfirm({ status: "RETURNED" });
      })
    ).rejects.toThrow("Nie udało się oznaczyć żadnego elementu jako zwróconego.");

    expect(setSuccessMessage).not.toHaveBeenCalled();
    expect(setErrorMessage).toHaveBeenCalledWith(
      "Nie udało się oznaczyć żadnego elementu jako zwróconego."
    );
    expect(result.current.returnDialogOpen).toBe(true);
  });

  it("handleRentAll: routes 100% failure to setErrorMessage", async () => {
    const setSuccessMessage = vi.fn();
    const setErrorMessage = vi.fn();
    const updateReservation = vi.fn().mockRejectedValue(new Error("Sprzęt uszkodzony"));

    const { result } = renderHook(
      () =>
        useReservationDialogs({
          currentUserId: "user-1",
          sessionUserBalance: 100,
          updateReservation,
          cancelReservation: vi.fn(),
          bulkUpdateStatus: vi.fn(),
          setSuccessMessage,
          setErrorMessage,
        }),
      { wrapper }
    );

    const items = [makeItem("res-1"), makeItem("res-2")];
    await act(async () => {
      await result.current.handleRentAll(items);
    });

    expect(setSuccessMessage).not.toHaveBeenCalled();
    expect(setErrorMessage).toHaveBeenCalledWith(
      "Nie udało się wypożyczyć żadnego z wybranych sprzętów."
    );
  });
});
