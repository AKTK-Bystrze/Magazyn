import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReturnNavigation } from "../useReturnNavigation";

describe("useReturnNavigation", () => {
  const originalReferrer = document.referrer;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "referrer", {
      value: "",
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(document, "referrer", {
      value: originalReferrer,
      configurable: true,
      writable: true,
    });
  });

  it("defaults backHref to defaultPath when no referrer or returnUrl is present", () => {
    const { result } = renderHook(() => useReturnNavigation("/equipment"));
    expect(result.current.backHref).toBe("/equipment");
  });

  it("updates backHref to same-origin referrer", () => {
    Object.defineProperty(document, "referrer", {
      value: "http://localhost:3000/reservations/create",
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useReturnNavigation("/equipment"));
    expect(result.current.backHref).toBe("/reservations/create");
  });

  it("ignores external cross-origin referrer", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://evil.com/phishing",
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useReturnNavigation("/equipment"));
    expect(result.current.backHref).toBe("/equipment");
  });

  it("calls window.history.back() when history.length > 1 and referrer is same origin", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    Object.defineProperty(document, "referrer", {
      value: "http://localhost:3000/reservations/create",
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window.history, "length", {
      value: 3,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useReturnNavigation("/equipment"));

    const fakeEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent<HTMLAnchorElement>;

    act(() => {
      result.current.handleBack(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(backSpy).toHaveBeenCalled();
  });
});
