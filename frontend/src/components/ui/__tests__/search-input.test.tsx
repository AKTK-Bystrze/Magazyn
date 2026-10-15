import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchInput } from "../search-input";

describe("SearchInput", () => {
  const onSearchChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with placeholder and initial value", () => {
    render(<SearchInput placeholder="Szukaj..." value="initial" onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText("Szukaj...");
    expect(input).toHaveValue("initial");
  });

  it("debounces onSearchChange callback", () => {
    render(<SearchInput placeholder="Szukaj..." onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText("Szukaj...");
    fireEvent.change(input, { target: { value: "test" } });

    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  it("invokes onSearchChange when input is cleared", () => {
    render(
      <SearchInput placeholder="Szukaj..." value="active search" onSearchChange={onSearchChange} />
    );

    const input = screen.getByPlaceholderText("Szukaj...");
    fireEvent.change(input, { target: { value: "" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("syncs external value change", () => {
    const { rerender } = render(
      <SearchInput placeholder="Szukaj..." value="first" onSearchChange={onSearchChange} />
    );

    const input = screen.getByPlaceholderText("Szukaj...");
    expect(input).toHaveValue("first");

    rerender(<SearchInput placeholder="Szukaj..." value="" onSearchChange={onSearchChange} />);

    expect(input).toHaveValue("");
  });

  it("triggers onSearchChange immediately when Enter key is pressed", () => {
    render(<SearchInput placeholder="Szukaj..." onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText("Szukaj...");
    fireEvent.change(input, { target: { value: "quick search" } });

    expect(onSearchChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearchChange).toHaveBeenCalledWith("quick search");
    expect(onSearchChange).toHaveBeenCalledTimes(1);

    // Ensure timer does not trigger a duplicate callback
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchChange).toHaveBeenCalledTimes(1);
  });

  it("does not restart debounce timer when onSearchChange callback reference changes", () => {
    const onSearchChange1 = vi.fn();
    const onSearchChange2 = vi.fn();

    const { rerender } = render(
      <SearchInput placeholder="Szukaj..." onSearchChange={onSearchChange1} />
    );

    const input = screen.getByPlaceholderText("Szukaj...");
    fireEvent.change(input, { target: { value: "debounced" } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Parent re-renders and passes new callback reference
    rerender(<SearchInput placeholder="Szukaj..." onSearchChange={onSearchChange2} />);

    // Advancing the remaining 100ms should fire the new callback
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onSearchChange1).not.toHaveBeenCalled();
    expect(onSearchChange2).toHaveBeenCalledWith("debounced");
  });
});
