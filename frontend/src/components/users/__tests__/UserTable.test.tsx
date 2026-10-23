import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserTable } from "../UserTable";
import type { UserListItem } from "@/types";

const testUser: UserListItem = {
  id: "user-1",
  email: "user@example.com",
  username: "testuser",
  role: "user",
  creditBalance: 50,
  isEnabled: true,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("UserTable credit actions", () => {
  it("routes the row credit action to the shared adjustment callback", () => {
    const onAdjustCredits = vi.fn();

    render(
      <UserTable
        users={[testUser]}
        isLoading={false}
        isSuperAdmin
        onEdit={vi.fn()}
        onAdjustCredits={onAdjustCredits}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Dostosuj godzinki testuser" }));

    expect(onAdjustCredits).toHaveBeenCalledWith(testUser);
  });

  it("continues to route checkbox selection to the group adjustment action", () => {
    const onToggleSelect = vi.fn();

    render(
      <UserTable
        users={[testUser]}
        isLoading={false}
        isSuperAdmin
        onEdit={vi.fn()}
        onAdjustCredits={vi.fn()}
        onToggleSelect={onToggleSelect}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Zaznacz testuser" }));

    expect(onToggleSelect).toHaveBeenCalledWith(testUser.id);
  });
});