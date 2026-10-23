import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "../Sidebar";

describe("Sidebar", () => {
  it("uses the same equipment label for users and admins", () => {
    const { rerender } = render(<Sidebar currentPath="/equipment" />);

    expect(screen.getByRole("link", { name: "Zarezerwuj Sprzęt" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sprzęt" })).not.toBeInTheDocument();

    rerender(<Sidebar currentPath="/admin/equipment" isAdmin />);

    expect(screen.getByRole("link", { name: "Zarezerwuj Sprzęt" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sprzęt" })).not.toBeInTheDocument();
  });

  it("changes visible links by role without changing shared labels", () => {
    const { rerender } = render(<Sidebar currentPath="/dashboard" />);

    expect(screen.getByRole("link", { name: "Panel" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Użytkownicy" })).not.toBeInTheDocument();

    rerender(<Sidebar currentPath="/admin" isAdmin />);

    expect(screen.getByRole("link", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Użytkownicy" })).toBeInTheDocument();
  });
});