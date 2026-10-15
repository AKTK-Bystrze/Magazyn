import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateLocalized,
  formatDateTime,
  calculateDays,
  formatRelativeTime,
  getTodayAtMidnight,
  getTodayAsString,
} from "../date-utils";

describe("date-utils", () => {
  describe("formatDate", () => {
    it("formats ISO date string into DD/MM/YYYY", () => {
      expect(formatDate("2024-01-15")).toBe("15/01/2024");
      expect(formatDate("2024-12-05T10:30:00Z")).toBe(formatDate(new Date("2024-12-05T10:30:00Z")));
    });

    it("formats Date object into DD/MM/YYYY", () => {
      const d = new Date(2024, 4, 9); // May 9, 2024
      expect(formatDate(d)).toBe("09/05/2024");
    });

    it("handles invalid date strings gracefully", () => {
      expect(formatDate("invalid-date")).toBe("invalid-date");
    });
  });

  describe("formatDateLocalized", () => {
    it("acts as an alias for formatDate", () => {
      expect(formatDateLocalized("2024-03-22")).toBe(formatDate("2024-03-22"));
      expect(formatDateLocalized("2024-03-22")).toBe("22/03/2024");
    });
  });

  describe("formatDateTime", () => {
    it("formats Date object into DD/MM/YYYY HH:mm", () => {
      const d = new Date(2024, 0, 15, 14, 5); // 15 Jan 2024 14:05
      expect(formatDateTime(d)).toBe("15/01/2024 14:05");
    });

    it("formats ISO date string into DD/MM/YYYY HH:mm", () => {
      const d = new Date("2024-06-20T09:07:00");
      const expected = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      expect(formatDateTime(d.toISOString())).toBe(expected);
    });

    it("handles invalid date string gracefully", () => {
      expect(formatDateTime("not-a-date")).toBe("not-a-date");
    });
  });

  describe("calculateDays", () => {
    it("calculates inclusive days between two dates", () => {
      expect(calculateDays("2024-01-01", "2024-01-01")).toBe(1);
      expect(calculateDays("2024-01-01", "2024-01-05")).toBe(5);
    });
  });

  describe("formatRelativeTime", () => {
    it("returns 'just now' for recent times", () => {
      const now = new Date();
      expect(formatRelativeTime(now.toISOString())).toBe("just now");
    });

    it("returns minutes ago for timestamps minutes in the past", () => {
      const past = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(past.toISOString())).toBe("5 minutes ago");
    });

    it("handles invalid date string gracefully", () => {
      expect(formatRelativeTime("bad-date")).toBe("bad-date");
    });
  });

  describe("getTodayAtMidnight", () => {
    it("returns a Date at 00:00:00", () => {
      const midnight = getTodayAtMidnight();
      expect(midnight.getHours()).toBe(0);
      expect(midnight.getMinutes()).toBe(0);
      expect(midnight.getSeconds()).toBe(0);
      expect(midnight.getMilliseconds()).toBe(0);
    });
  });

  describe("getTodayAsString", () => {
    it("returns YYYY-MM-DD format", () => {
      const str = getTodayAsString();
      expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
