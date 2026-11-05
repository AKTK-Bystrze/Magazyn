import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ModifyDatesDialog } from "../ModifyDatesDialog";
import type { Reservation } from "@/types";

describe("ModifyDatesDialog", () => {
  const mockReservation: Reservation = {
    id: "res-1",
    userId: "user-1",
    username: "testuser",
    equipmentId: "eq-1",
    equipmentName: "Kajak Górski",
    equipmentType: "Kajaki",
    startDate: "2026-05-10",
    endDate: "2026-05-12",
    status: "PENDING",
    creditCost: 30,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: null,
  };

  it("keeps dialog open and renders apiError when onConfirm fails", async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValue(new Error("Termin jest zajęty przez inną rezerwację"));
    const onOpenChange = vi.fn();

    render(
      <ModifyDatesDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        onConfirm={onConfirm}
        isSubmitting={false}
        currentUserBalance={100}
      />
    );

    // Change end date to trigger datesChanged
    const endDateInput = screen.getByTestId("end-date-input");
    fireEvent.change(endDateInput, { target: { value: "2026-05-14" } });

    const saveButton = screen.getByTestId("save-dates-button");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Termin jest zajęty przez inną rezerwację")).toBeInTheDocument();
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("disables buttons and prevents closing while submitting", () => {
    const onOpenChange = vi.fn();

    render(
      <ModifyDatesDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        onConfirm={vi.fn()}
        isSubmitting={true}
        currentUserBalance={100}
      />
    );

    const saveButton = screen.getByTestId("save-dates-button");
    const cancelButton = screen.getByRole("button", { name: "Anuluj" });
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    fireEvent.click(cancelButton);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes dialog on successful confirmation", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <ModifyDatesDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        onConfirm={onConfirm}
        isSubmitting={false}
        currentUserBalance={100}
      />
    );

    const endDateInput = screen.getByTestId("end-date-input");
    fireEvent.change(endDateInput, { target: { value: "2026-05-14" } });

    const saveButton = screen.getByTestId("save-dates-button");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        startDate: "2026-05-10",
        endDate: "2026-05-14",
      });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
