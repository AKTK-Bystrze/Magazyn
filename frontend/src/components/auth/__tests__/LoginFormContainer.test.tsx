import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginFormContainer } from "../LoginFormContainer";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe("LoginFormContainer", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it("renders standard login form when idle without tokens in url", () => {
    render(<LoginFormContainer />);

    expect(screen.getByText("Witaj")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zaloguj się przez E-mail" })).toBeInTheDocument();
    expect(screen.queryByTestId("auth-redirecting-state")).not.toBeInTheDocument();
  });

  it("renders loading authenticating state when access_token is in hash", () => {
    // Mock window.location with access_token in hash
    delete (window as unknown as { location?: unknown }).location;
    window.location = {
      ...originalLocation,
      hash: "#access_token=test-token&refresh_token=test-refresh&type=magiclink",
      search: "",
    } as unknown as Location;

    render(<LoginFormContainer />);

    expect(screen.getByTestId("auth-redirecting-state")).toBeInTheDocument();
    expect(screen.getByText("Trwa logowanie, proszę czekać...")).toBeInTheDocument();
    expect(screen.queryByText("Witaj")).not.toBeInTheDocument();
  });

  it("renders loading authenticating state when code is in search params", () => {
    // Mock window.location with code in search params
    delete (window as unknown as { location?: unknown }).location;
    window.location = {
      ...originalLocation,
      hash: "",
      search: "?code=test-auth-code",
    } as unknown as Location;

    render(<LoginFormContainer />);

    expect(screen.getByTestId("auth-redirecting-state")).toBeInTheDocument();
    expect(screen.getByText("Trwa logowanie, proszę czekać...")).toBeInTheDocument();
    expect(screen.queryByText("Witaj")).not.toBeInTheDocument();
  });
});
