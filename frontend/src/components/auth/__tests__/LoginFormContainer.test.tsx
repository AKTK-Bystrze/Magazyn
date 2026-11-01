import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginFormContainer } from "../LoginFormContainer";

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
  });

  it("forwards auth fragments to the /api/auth/callback handoff page", () => {
    delete (window as unknown as { location?: unknown }).location;
    const replace = vi.fn();
    window.location = {
      ...originalLocation,
      hash: "#access_token=test-token&refresh_token=test-refresh&type=magiclink",
      search: "",
      replace,
    } as unknown as Location;

    render(<LoginFormContainer />);

    expect(replace).toHaveBeenCalledWith(
      "/api/auth/callback#access_token=test-token&refresh_token=test-refresh&type=magiclink"
    );
    expect(screen.getByText("Witaj")).toBeInTheDocument();
  });

  it("forwards auth codes in the query string to the handoff page", () => {
    delete (window as unknown as { location?: unknown }).location;
    const replace = vi.fn();
    window.location = {
      ...originalLocation,
      hash: "",
      search: "?code=test-auth-code",
      replace,
    } as unknown as Location;

    render(<LoginFormContainer />);

    expect(replace).toHaveBeenCalledWith("/api/auth/callback?code=test-auth-code");
  });
});
