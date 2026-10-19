import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReturnWithDatesDialog } from "../ReturnWithDatesDialog";
import type { Reservation } from "@/types";

describe("ReturnWithDatesDialog", () => {
  const mockReservation: Reservation = {
    id: "res-1",
    userId: "user-1",
    username: "testuser",
    equipmentId: "eq-1",
    equipmentName: "Kajak Górski",
    equipmentType: "Kajaki",
    startDate: "2026-05-10",
    endDate: "2026-05-12",
    status: "RENTED",
    creditCost: 30,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: null,
  };

  it("renders dialog content when open is true", () => {
    render(
      <ReturnWithDatesDialog
        open={true}
        onOpenChange={vi.fn()}
        reservation={mockReservation}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        isSubmitting={false}
        currentUserBalance={10}
      />
    );

    expect(screen.getByText("Oznacz jako Zwrócone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Potwierdź Zwrot" })).toBeInTheDocument();
  });

  it("allows return without modifying dates even when user balance is negative", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <ReturnWithDatesDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        onConfirm={onConfirm}
        isSubmitting={false}
        currentUserBalance={-20}
      />
    );

    const confirmButton = screen.getByRole("button", { name: "Potwierdź Zwrot" });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        status: "RETURNED",
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("allows return with modified dates resulting in negative balance (overdue return)", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <ReturnWithDatesDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        onConfirm={onConfirm}
        isSubmitting={false}
        currentUserBalance={0}
      />
    );

    // Toggle modify dates checkbox
    const modifyCheckbox = screen.getByRole("checkbox");
    fireEvent.click(modifyCheckbox);

    // Change end date to an overdue date (2026-05-15, which increases days from 3 to 6 and cost from 30 to 60)
    const endDateInput = screen.getByTestId("end-date-input");
    fireEvent.change(endDateInput, { target: { value: "2026-05-15" } });

    // Confirm button must NOT be disabled despite newBalance < 0
    const confirmButton = screen.getByRole("button", { name: "Potwierdź Zwrot" });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        status: "RETURNED",
        startDate: "2026-05-10",
        endDate: "2026-05-15",
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("still validates that endDate is after startDate when modifying dates", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ReturnWithDatesDialog
        open={true}
        onOpenChange={vi.fn()}
        reservation={mockReservation}
        onConfirm={onConfirm}
        isSubmitting={false}
        currentUserBalance={100}
      />
    );

    // Toggle modify dates checkbox
    const modifyCheckbox = screen.getByRole("checkbox");
    fireEvent.click(modifyCheckbox);

    // Change end date before start date
    const endDateInput = screen.getByTestId("end-date-input");
    fireEvent.change(endDateInput, { target: { value: "2026-05-08" } });

    const confirmButton = screen.getByRole("button", { name: "Potwierdź Zwrot" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(
        screen.getByText("Data zakończenia musi być równa lub późniejsza niż data rozpoczęcia")
      ).toBeInTheDocument();
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("forwards defect/comment notes when confirmed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <ReturnWithDatesDialog
        open={true}
        onOpenChange={onOpenChange}
        reservation={mockReservation}
        onConfirm={onConfirm}
        isSubmitting={false}
        currentUserBalance={50}
      />
    );

    const notesTextarea = screen.getByTestId("return-notes-input");
    expect(notesTextarea).toBeInTheDocument();

    fireEvent.change(notesTextarea, {
      target: { value: "Pęknięte pióro wiosła i zarysowana burta" },
    });

    const confirmButton = screen.getByRole("button", { name: "Potwierdź Zwrot" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        status: "RETURNED",
        notes: "Pęknięte pióro wiosła i zarysowana burta",
      });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
