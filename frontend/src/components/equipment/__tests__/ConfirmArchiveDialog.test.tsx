import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmArchiveDialog } from "../ConfirmArchiveDialog";
import type { EquipmentSearchItem } from "@/types";

describe("ConfirmArchiveDialog", () => {
  const mockEquipment: EquipmentSearchItem = {
    id: "eq-1",
    internalId: "KAJ-001",
    name: "Kajak Jedynka",
    description: "Kajak polietylenowy",
    status: "ok",
    imagePath: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    type: {
      id: "type-1",
      name: "Kajak",
      creditCostPerDay: 15,
      createdAt: "2026-01-01T00:00:00Z",
    },
  };

  it("renders delete title and permanent removal warning without false restore promise", () => {
    render(
      <ConfirmArchiveDialog
        isOpen={true}
        equipment={mockEquipment}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("Usunąć Sprzęt?")).toBeInTheDocument();
    expect(
      screen.getByText(/To usunie sprzęt z inwentarza\. Ta operacja jest nieodwracalna\./i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/można go później przywrócić/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("equipment-archive-confirm-btn")).toHaveTextContent("Usuń Sprzęt");
  });

  it("calls onConfirm when delete button is clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ConfirmArchiveDialog
        isOpen={true}
        equipment={mockEquipment}
        isSubmitting={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId("equipment-archive-confirm-btn"));
    expect(onConfirm).toHaveBeenCalledWith("eq-1");
  });
});
