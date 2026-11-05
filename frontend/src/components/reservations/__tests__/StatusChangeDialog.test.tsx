import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StatusChangeDialog } from "../StatusChangeDialog";
import type { ReservationDetail } from "@/types";

describe("StatusChangeDialog", () => {
  const mockReservation: ReservationDetail = {
    id: "res-1",
    userId: "user-1",
    username: "testuser",
    userEmail: "test@example.com",
    equipmentId: "eq-1",
    equipmentName: "Kajak Górski",
    equipmentType: "Kajaki",
    equipmentInternalId: "EQ-01",
    startDate: "2026-05-10",
    endDate: "2026-05-12",
    status: "PENDING",
    creditCost: 30,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: null,
    auditTrail: [],
  };

  it("closes dialog on successful confirmation", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <StatusChangeDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        targetStatus="CANCELLED"
        onConfirm={onConfirm}
        isSubmitting={false}
        mode="cancel"
      />
    );

    const confirmButton = screen.getByRole("button", { name: "Anuluj Rezerwację" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close dialog when onConfirm rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Network error"));
    const onOpenChange = vi.fn();

    render(
      <StatusChangeDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        targetStatus="CANCELLED"
        onConfirm={onConfirm}
        isSubmitting={false}
        mode="cancel"
      />
    );

    const confirmButton = screen.getByRole("button", { name: "Anuluj Rezerwację" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("disables buttons and prevents closing while submitting", () => {
    const onOpenChange = vi.fn();

    render(
      <StatusChangeDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        targetStatus="CANCELLED"
        onConfirm={vi.fn()}
        isSubmitting={true}
        mode="cancel"
      />
    );

    const confirmButton = screen.getByRole("button", { name: /ładowanie/i });
    const cancelButton = screen.getByRole("button", { name: "Zachowaj Rezerwację" });
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    fireEvent.click(cancelButton);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
