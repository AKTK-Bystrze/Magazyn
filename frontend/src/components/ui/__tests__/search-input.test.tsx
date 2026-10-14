import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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
    render(
      <SearchInput placeholder="Szukaj..." onSearchChange={onSearchChange} debounceMs={300} />
    );

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

  it("clears input and invokes onSearchChange immediately on clear button click", () => {
    render(
      <SearchInput placeholder="Szukaj..." value="active search" onSearchChange={onSearchChange} />
    );

    const clearButton = screen.getByRole("button", { name: "Wyczyść pole wyszukiwania" });
    fireEvent.click(clearButton);

    const input = screen.getByPlaceholderText("Szukaj...");
    expect(input).toHaveValue("");
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
});
