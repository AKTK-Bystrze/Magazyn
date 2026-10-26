import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdjustCreditsDialog } from "../AdjustCreditsDialog";

describe("AdjustCreditsDialog", () => {
  it("submits one-user adjustments with the same required reason and notes fields", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <AdjustCreditsDialog
        isOpen
        isSubmitting={false}
        userIds={["user-1"]}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText("Dostosuj stan konta dla wybranego użytkownika.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Kwota"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Powód (wymagany)"), {
      target: { value: "Nagroda za pomoc" },
    });
    fireEvent.change(screen.getByLabelText("Dodatkowe notatki (opcjonalnie)"), {
      target: { value: "Porządkowanie magazynu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj Godzinki" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        userIds: ["user-1"],
        amount: 25,
        reason: "Nagroda za pomoc",
        description: "Porządkowanie magazynu",
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("retains the group adjustment target list", () => {
    render(
      <AdjustCreditsDialog
        isOpen
        isSubmitting={false}
        userIds={["user-1", "user-2"]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.getByText("Dostosuj stan konta dla 2 wybranych użytkowników.")
    ).toBeInTheDocument();
    expect(screen.getByText("Powód (wymagany)")).toBeInTheDocument();
  });

  it("displays target user info and live projected balance preview", () => {
    const targetUser = {
      username: "mati",
      email: "mati@example.com",
      creditBalance: 14,
    };

    render(
      <AdjustCreditsDialog
        isOpen
        isSubmitting={false}
        userIds={["user-1"]}
        targetUser={targetUser}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getAllByText(/mati/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("current-credit-balance")).toHaveTextContent("14 godzinek");

    fireEvent.change(screen.getByLabelText("Kwota"), { target: { value: "86" } });

    expect(screen.getByTestId("projected-credit-balance")).toHaveTextContent("100");
  });
});