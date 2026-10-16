import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationTableRow } from "../ReservationTableRow";
import type { ReservationListItem } from "@/types";

describe("ReservationTableRow", () => {
  const mockItem: ReservationListItem = {
    id: "res-101",
    userId: "user-1",
    username: "testuser",
    equipmentId: "eq-1",
    equipmentName: "Kajak Górski",
    equipmentType: "Kajaki",
    status: "PENDING",
    startDate: "2026-05-10T10:00:00Z",
    endDate: "2026-05-12T18:00:00Z",
    creditCost: 30,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: null,
  };

  const renderInTable = (ui: React.ReactElement) => {
    return render(
      <table>
        <tbody>{ui}</tbody>
      </table>
    );
  };

  it("renders equipment details and formatted dates", () => {
    const onViewDetails = vi.fn();
    renderInTable(
      <ReservationTableRow
        item={mockItem}
        showUserColumn={false}
        mode="user"
        scope="my"
        onViewDetails={onViewDetails}
      />
    );

    expect(screen.getAllByText("Kajak Górski").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Kajaki")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renders status badge matching reservation status", () => {
    renderInTable(
      <ReservationTableRow
        item={mockItem}
        showUserColumn={false}
        mode="user"
        scope="my"
        onViewDetails={vi.fn()}
      />
    );

    const badges = screen.getAllByTestId(`reservation-status-${mockItem.id}`);
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0]).toHaveTextContent("W trakcie");
  });

  it("renders username column and indicates current user with (Ty)", () => {
    renderInTable(
      <ReservationTableRow
        item={mockItem}
        showUserColumn={true}
        currentUserId="user-1"
        mode="admin"
        scope="all"
        onViewDetails={vi.fn()}
      />
    );

    expect(screen.getByText(/testuser\s*\(Ty\)/)).toBeInTheDocument();
  });

  it("triggers onViewDetails callback when row is clicked, but not when action menu is used", () => {
    const onViewDetails = vi.fn();
    const onCancel = vi.fn();
    renderInTable(
      <ReservationTableRow
        item={mockItem}
        showUserColumn={false}
        mode="user"
        scope="my"
        onViewDetails={onViewDetails}
        onCancel={onCancel}
      />
    );

    // Interacting with action menu trigger does not trigger row's onViewDetails
    const triggers = screen.getAllByTestId("reservation-action-menu-trigger");
    fireEvent.click(triggers[0]);
    expect(onViewDetails).not.toHaveBeenCalled();

    // Click cancel button inside menu if open
    const cancelButton = screen.queryByTestId("cancel-reservation-button");
    if (cancelButton) {
      fireEvent.click(cancelButton);
      expect(onCancel).toHaveBeenCalledWith(mockItem);
      expect(onViewDetails).not.toHaveBeenCalled();
    }

    // Clicking the row itself should trigger onViewDetails
    const row = screen.getByTestId(`reservation-row-${mockItem.id}`);
    fireEvent.click(row);
    expect(onViewDetails).toHaveBeenCalledWith(mockItem);
  });
});
