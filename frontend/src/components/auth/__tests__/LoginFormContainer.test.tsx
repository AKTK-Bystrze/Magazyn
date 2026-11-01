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
});
