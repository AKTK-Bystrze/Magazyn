import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserHeader } from "../UserHeader";

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

  it("renders credits badge visible with Polish label Godzinki", () => {
    render(<UserHeader user={mockUser} currentPath="/reservations" creditBalance={75} />);

    const badge = screen.getByTestId("header-credits-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Godzinki: 75");
    expect(badge.className).not.toContain("hidden sm:flex");
  });

  it("does not render credits badge when creditBalance is undefined", () => {
    render(<UserHeader user={mockUser} currentPath="/reservations" />);

    expect(screen.queryByTestId("header-credits-badge")).not.toBeInTheDocument();
  });
});
