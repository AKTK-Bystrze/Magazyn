import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { UserHeader } from "../UserHeader";
import { renderWithQueryClient } from "@/test/test-utils";
import { resetCreditBalance } from "@/lib/stores/credits";

const { getHistoryMock } = vi.hoisted(() => ({
  getHistoryMock: vi.fn(),
}));

vi.mock("@/lib/api/credits-api", () => ({
  creditsApi: { getHistory: getHistoryMock },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe("UserHeader", () => {
  const mockUser = {
    id: "user-123",
    email: "jan.kowalski@example.com",
  };

  beforeEach(() => {
    resetCreditBalance();
    getHistoryMock.mockReset();
  });

  it("renders credits badge visible with Polish label Godzinki", () => {
    getHistoryMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(
      <UserHeader user={mockUser} currentPath="/reservations" creditBalance={75} />
    );

    const badge = screen.getByTestId("header-credits-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Godzinki: 75");
    expect(badge.className).not.toContain("hidden sm:flex");
  });

  it("uses the credit history balance for admins", async () => {
    getHistoryMock.mockResolvedValue({ currentBalance: 24 });

    renderWithQueryClient(
      <UserHeader user={mockUser} currentPath="/reservations" creditBalance={1000} isAdmin />
    );

    await waitFor(() => {
      expect(screen.getByTestId("header-credits-badge")).toHaveTextContent("Godzinki: 24");
    });
    expect(getHistoryMock).toHaveBeenCalledWith({ page: 1, perPage: 10 });
  });

  it("fetches and displays updated credit history balance for regular users", async () => {
    getHistoryMock.mockResolvedValue({ currentBalance: 85 });

    renderWithQueryClient(
      <UserHeader user={mockUser} currentPath="/reservations" creditBalance={75} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("header-credits-badge")).toHaveTextContent("Godzinki: 85");
    });
    expect(getHistoryMock).toHaveBeenCalledWith({ page: 1, perPage: 10 });
  });

  it("does not render credits badge when creditBalance is undefined and history has no balance", () => {
    getHistoryMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<UserHeader user={mockUser} currentPath="/reservations" />);

    expect(screen.queryByTestId("header-credits-badge")).not.toBeInTheDocument();
  });
});
