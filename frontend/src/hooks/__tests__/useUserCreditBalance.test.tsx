import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserCreditBalance } from "../useUserCreditBalance";

const { getHistoryMock } = vi.hoisted(() => ({
  getHistoryMock: vi.fn(),
}));

vi.mock("@/lib/api/credits-api", () => ({
  creditsApi: { getHistory: getHistoryMock },
}));

describe("useUserCreditBalance", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });
    getHistoryMock.mockReset();
  });

  it("returns initialBalance as placeholder immediately and updates after fetch resolves", async () => {
    getHistoryMock.mockResolvedValue({ currentBalance: 120 });

    const { result } = renderHook(() => useUserCreditBalance(50), { wrapper });

    expect(result.current.creditBalance).toBe(50);

    await waitFor(() => {
      expect(result.current.creditBalance).toBe(120);
    });

    expect(getHistoryMock).toHaveBeenCalledWith({ page: 1, perPage: 1 });
  });

  it("does not fetch when enabled is false", async () => {
    const { result } = renderHook(() => useUserCreditBalance(30, false), { wrapper });

    expect(result.current.creditBalance).toBe(30);
    expect(getHistoryMock).not.toHaveBeenCalled();
  });

  it("invalidates balance query and triggers refetch when invalidateBalance is called", async () => {
    getHistoryMock.mockResolvedValueOnce({ currentBalance: 100 });

    const { result } = renderHook(() => useUserCreditBalance(100), { wrapper });

    await waitFor(() => {
      expect(result.current.creditBalance).toBe(100);
    });

    getHistoryMock.mockResolvedValueOnce({ currentBalance: 150 });

    await act(async () => {
      await result.current.invalidateBalance();
    });

    await waitFor(() => {
      expect(result.current.creditBalance).toBe(150);
    });

    expect(getHistoryMock).toHaveBeenCalledTimes(2);
  });

  it("refetches balance when refetch is called", async () => {
    getHistoryMock.mockResolvedValueOnce({ currentBalance: 40 });

    const { result } = renderHook(() => useUserCreditBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.creditBalance).toBe(40);
    });

    getHistoryMock.mockResolvedValueOnce({ currentBalance: 60 });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.creditBalance).toBe(60);
    });

    expect(getHistoryMock).toHaveBeenCalledTimes(2);
  });
});
