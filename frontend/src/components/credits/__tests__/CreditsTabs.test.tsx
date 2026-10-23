import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditsTabs } from "../CreditsTabs";

vi.mock("../CreditHistoryContainer", () => ({
  CreditHistoryContainer: () => <div>Historia kredytów</div>,
}));

vi.mock("../UsersCreditsList", () => ({
  UsersCreditsList: () => <div>Ranking użytkowników</div>,
}));

vi.mock("../CreditsList", () => ({
  CreditsList: () => <div>Lista wniosków</div>,
}));

vi.mock("../CreditRequestForm", () => ({
  CreditRequestForm: () => <div>Formularz wniosku</div>,
}));

describe("CreditsTabs", () => {
  it("shows history first and selects it by default", () => {
    render(<CreditsTabs userId="user-1" isSuperAdmin={false} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("Historia");
    expect(tabs[0]).toHaveAttribute("data-state", "active");
    expect(tabs[1]).toHaveTextContent("Ranking Godzinek");
    expect(screen.getByText("Historia kredytów")).toBeInTheDocument();
    expect(screen.queryByText("Ranking użytkowników")).not.toBeInTheDocument();
  });
});