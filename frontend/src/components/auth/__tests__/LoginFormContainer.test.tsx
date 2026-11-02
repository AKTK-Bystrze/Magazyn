import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginFormContainer } from "../LoginFormContainer";
import { USER_VALIDATION_MESSAGES } from "@/lib/config/constants";

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
    expect(screen.queryByTestId("login-error-alert")).not.toBeInTheDocument();
  });

  it("displays expired magic link error alert when error query param is otp_expired", () => {
    delete (window as unknown as { location?: unknown }).location;
    window.location = {
      ...originalLocation,
      pathname: "/login",
      search: "?error=otp_expired",
      hash: "",
    } as unknown as Location;

    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(<LoginFormContainer />);

    expect(screen.getByTestId("login-error-alert")).toBeInTheDocument();
    expect(screen.getByText(USER_VALIDATION_MESSAGES.LOGIN_LINK_EXPIRED)).toBeInTheDocument();
    expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/login");
  });

  it("displays expired magic link error alert when error_code is in hash fragment", () => {
    delete (window as unknown as { location?: unknown }).location;
    window.location = {
      ...originalLocation,
      pathname: "/login",
      search: "",
      hash: "#error=access_denied&error_code=otp_expired",
    } as unknown as Location;

    render(<LoginFormContainer />);

    expect(screen.getByTestId("login-error-alert")).toBeInTheDocument();
    expect(screen.getByText(USER_VALIDATION_MESSAGES.LOGIN_LINK_EXPIRED)).toBeInTheDocument();
  });

  it("displays login failed error alert when error query param is missing_session", () => {
    delete (window as unknown as { location?: unknown }).location;
    window.location = {
      ...originalLocation,
      pathname: "/login",
      search: "?error=missing_session",
      hash: "",
    } as unknown as Location;

    render(<LoginFormContainer />);

    expect(screen.getByTestId("login-error-alert")).toBeInTheDocument();
    expect(screen.getByText(USER_VALIDATION_MESSAGES.LOGIN_FAILED)).toBeInTheDocument();
  });

  it("clears error alert when user types in email input", () => {
    delete (window as unknown as { location?: unknown }).location;
    window.location = {
      ...originalLocation,
      pathname: "/login",
      search: "?error=otp_expired",
      hash: "",
    } as unknown as Location;

    render(<LoginFormContainer />);

    expect(screen.getByTestId("login-error-alert")).toBeInTheDocument();

    const input = screen.getByTestId("login-email-input");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    expect(screen.queryByTestId("login-error-alert")).not.toBeInTheDocument();
  });
});
