import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock("../cookie-utils", () => ({
  removeAuthCookie: vi.fn(),
}));

import { handleLogout } from "../logout";
import { supabase } from "@/lib/supabase";
import { removeAuthCookie } from "../cookie-utils";
import { ROUTES } from "@/lib/config/routes";

describe("handleLogout", () => {
  let originalWindow: typeof window;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWindow = global.window;

    vi.stubGlobal("location", {
      href: "http://localhost:3000/dashboard",
      pathname: "/dashboard",
      origin: "http://localhost:3000",
    });

    fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "Logged out" }), { status: 200 }));
    global.fetch = fetchMock;

    // Reset localStorage
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.window = originalWindow;
    localStorage.clear();
    sessionStorage.clear();
  });

  it("performs complete client-side logout flow", async () => {
    localStorage.setItem("sb-access-token", "xyz");
    localStorage.setItem("magazyn-theme", "dark");
    localStorage.setItem("unrelated-key", "keep-me");
    sessionStorage.setItem("temp-data", "123");

    await handleLogout();

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    expect(removeAuthCookie).toHaveBeenCalledTimes(1);

    // Auth keys removed, unrelated keys kept
    expect(localStorage.getItem("sb-access-token")).toBeNull();
    expect(localStorage.getItem("magazyn-theme")).toBeNull();
    expect(localStorage.getItem("unrelated-key")).toBe("keep-me");
    expect(sessionStorage.getItem("temp-data")).toBeNull();

    expect(window.location.href).toBe(ROUTES.PUBLIC.LOGIN);
  });

  it("gracefully catches and proceeds when supabase.auth.signOut rejects", async () => {
    vi.mocked(supabase.auth.signOut).mockRejectedValueOnce(new Error("Network error"));

    await expect(handleLogout()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    expect(removeAuthCookie).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(ROUTES.PUBLIC.LOGIN);
  });

  it("gracefully catches and proceeds when /api/auth/logout fetch fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Server offline"));

    await expect(handleLogout()).resolves.toBeUndefined();

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(removeAuthCookie).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(ROUTES.PUBLIC.LOGIN);
  });

  it("is SSR safe when window is undefined", async () => {
    // Simulate non-browser environment
    const tempWindow = global.window;
    // @ts-expect-error simulating node environment
    delete global.window;

    try {
      await expect(handleLogout()).resolves.toBeUndefined();
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(removeAuthCookie).toHaveBeenCalledTimes(1);
    } finally {
      global.window = tempWindow;
    }
  });
});
