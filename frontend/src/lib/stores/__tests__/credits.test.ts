import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  $creditBalance,
  initCreditBalance,
  setCreditBalance,
  getCreditBalance,
  resetCreditBalance,
  refreshCreditBalance,
} from "../credits";

const { getHistoryMock } = vi.hoisted(() => ({
  getHistoryMock: vi.fn(),
}));

vi.mock("@/lib/api/credits-api", () => ({
  creditsApi: { getHistory: getHistoryMock },
}));

describe("credits store", () => {
  beforeEach(() => {
    resetCreditBalance();
    getHistoryMock.mockReset();
  });

  it("initializes balance when store is null", () => {
    expect(getCreditBalance()).toBeNull();

    initCreditBalance(50);
    expect(getCreditBalance()).toBe(50);

    // Should not overwrite once initialized
    initCreditBalance(100);
    expect(getCreditBalance()).toBe(50);
  });

  it("updates balance directly via setCreditBalance", () => {
    setCreditBalance(120);
    expect(getCreditBalance()).toBe(120);
    expect($creditBalance.get()).toBe(120);
  });

  it("resets store to null via resetCreditBalance", () => {
    setCreditBalance(80);
    expect(getCreditBalance()).toBe(80);

    resetCreditBalance();
    expect(getCreditBalance()).toBeNull();
  });

  it("refreshes balance from API successfully", async () => {
    getHistoryMock.mockResolvedValue({ currentBalance: 200 });

    const result = await refreshCreditBalance();

    expect(result).toBe(200);
    expect(getCreditBalance()).toBe(200);
    expect(getHistoryMock).toHaveBeenCalledWith({ page: 1, perPage: 1 });
  });

  it("deduplicates concurrent refresh requests", async () => {
    let resolvePromise: (value: { currentBalance: number }) => void;
    const promise = new Promise<{ currentBalance: number }>((resolve) => {
      resolvePromise = resolve;
    });
    getHistoryMock.mockReturnValue(promise);

    const call1 = refreshCreditBalance();
    const call2 = refreshCreditBalance();

    expect(getHistoryMock).toHaveBeenCalledTimes(1);

    resolvePromise!({ currentBalance: 350 });
    const [res1, res2] = await Promise.all([call1, call2]);

    expect(res1).toBe(350);
    expect(res2).toBe(350);
    expect(getCreditBalance()).toBe(350);
  });

  it("retains previous balance and handles API error gracefully", async () => {
    setCreditBalance(42);
    getHistoryMock.mockRejectedValue(new Error("Network failure"));

    const result = await refreshCreditBalance();

    expect(result).toBe(42);
    expect(getCreditBalance()).toBe(42);
  });
});
