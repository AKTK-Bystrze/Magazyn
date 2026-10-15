import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateLocalized,
  formatDateTime,
  calculateDays,
  formatRelativeTime,
} from "../date-utils";

describe("date-utils - empirical stress & adversarial harness", () => {
  describe("formatDate and formatDateLocalized", () => {
    it("formats epoch date (1970-01-01)", () => {
      const epoch = new Date(1970, 0, 1);
      expect(formatDate(epoch)).toBe("01/01/1970");
      expect(formatDateLocalized(epoch)).toBe("01/01/1970");
    });

    it("formats leap year days correctly (2024-02-29, 2020-02-29, 2000-02-29)", () => {
      const leap2024 = new Date(2024, 1, 29);
      expect(formatDate(leap2024)).toBe("29/02/2024");

      const leap2020 = new Date(2020, 1, 29);
      expect(formatDate(leap2020)).toBe("29/02/2020");

      const leap2000 = new Date(2000, 1, 29);
      expect(formatDate(leap2000)).toBe("29/02/2000");

      const nonLeapCentury1900 = new Date(1900, 1, 28);
      expect(formatDate(nonLeapCentury1900)).toBe("28/02/1900");
    });

    it("pads single-digit days and months with leading zeros", () => {
      for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= 9; d++) {
          const dt = new Date(2025, m, d);
          const formatted = formatDate(dt);
          const expectedDay = String(d).padStart(2, "0");
          const expectedMonth = String(m + 1).padStart(2, "0");
          expect(formatted).toBe(`${expectedDay}/${expectedMonth}/2025`);
        }
      }
    });

    it("formats year-end and year-start boundaries accurately", () => {
      const startOfYear = new Date(2025, 0, 1);
      const endOfYear = new Date(2025, 11, 31);
      expect(formatDate(startOfYear)).toBe("01/01/2025");
      expect(formatDate(endOfYear)).toBe("31/12/2025");
    });

    it("handles far past and far future dates", () => {
      const past = new Date(1850, 5, 15);
      const future = new Date(2200, 10, 20);
      expect(formatDate(past)).toBe("15/06/1850");
      expect(formatDate(future)).toBe("20/11/2200");
    });

    it("conforms to regex ^\\d{2}/\\d{2}/\\d{4}$ on valid dates", () => {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      const samples = [
        new Date(2023, 3, 5),
        new Date(2024, 8, 19),
        new Date(2025, 11, 31),
        new Date(1999, 0, 1),
      ];
      for (const s of samples) {
        expect(formatDate(s)).toMatch(dateRegex);
      }
    });

    it("gracefully returns original string or empty string on invalid dates without throwing", () => {
      expect(formatDate("invalid-date-string")).toBe("invalid-date-string");
      expect(formatDate("2024-99-99")).toBe("2024-99-99");
      expect(formatDate("")).toBe("");
      expect(formatDate(new Date(NaN))).toBe("");
      // @ts-expect-error Adversarial runtime input test
      expect(formatDate(null)).toBe("");
      // @ts-expect-error Adversarial runtime input test
      expect(formatDate(undefined)).toBe("");
      // @ts-expect-error Adversarial runtime input test
      expect(formatDate({})).toBe("");
    });
  });

  describe("formatDateTime", () => {
    it("formats epoch date-time", () => {
      const epoch = new Date(1970, 0, 1, 0, 0);
      expect(formatDateTime(epoch)).toBe("01/01/1970 00:00");
    });

    it("pads single-digit hours and minutes with leading zeros", () => {
      const d = new Date(2024, 2, 5, 7, 9);
      expect(formatDateTime(d)).toBe("05/03/2024 07:09");
    });

    it("formats midnight and end-of-day accurately", () => {
      const midnight = new Date(2024, 5, 15, 0, 0);
      const endOfDay = new Date(2024, 5, 15, 23, 59);
      expect(formatDateTime(midnight)).toBe("15/06/2024 00:00");
      expect(formatDateTime(endOfDay)).toBe("15/06/2024 23:59");
    });

    it("conforms to regex ^\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}$ on valid date-times", () => {
      const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
      const samples = [
        new Date(2023, 3, 5, 12, 30),
        new Date(2024, 8, 19, 0, 0),
        new Date(2025, 11, 31, 23, 59),
        new Date(1999, 0, 1, 6, 5),
      ];
      for (const s of samples) {
        expect(formatDateTime(s)).toMatch(dateTimeRegex);
      }
    });

    it("replaces date-fns format('dd/MM/yyyy HH:mm') output exactly", () => {
      // Prior implementation in CreditHistoryTable:
      // format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")
      const testDate = new Date("2026-03-15T14:45:00");
      const expectedDay = String(testDate.getDate()).padStart(2, "0");
      const expectedMonth = String(testDate.getMonth() + 1).padStart(2, "0");
      const expectedYear = testDate.getFullYear();
      const expectedHours = String(testDate.getHours()).padStart(2, "0");
      const expectedMinutes = String(testDate.getMinutes()).padStart(2, "0");
      const expectedEquivalent = `${expectedDay}/${expectedMonth}/${expectedYear} ${expectedHours}:${expectedMinutes}`;

      expect(formatDateTime(testDate)).toBe(expectedEquivalent);
      expect(formatDateTime(testDate.toISOString())).toBe(expectedEquivalent);
    });

    it("gracefully returns original string or empty string on invalid dates without throwing", () => {
      expect(formatDateTime("bad-timestamp")).toBe("bad-timestamp");
      expect(formatDateTime("")).toBe("");
      expect(formatDateTime(new Date(NaN))).toBe("");
      // @ts-expect-error Adversarial runtime input test
      expect(formatDateTime(null)).toBe("");
      // @ts-expect-error Adversarial runtime input test
      expect(formatDateTime(undefined)).toBe("");
    });
  });

  describe("formatRelativeTime and calculateDays resilience", () => {
    it("formatRelativeTime handles invalid strings without crashing", () => {
      expect(formatRelativeTime("corrupted-date")).toBe("corrupted-date");
      expect(formatRelativeTime("")).toBe("");
    });

    it("calculateDays correctly counts days across leap years and normal periods", () => {
      expect(calculateDays("2024-02-28", "2024-03-01")).toBe(3); // 28th, 29th, 1st
      expect(calculateDays("2023-02-28", "2023-03-01")).toBe(2); // 28th, 1st
      expect(calculateDays("2024-01-01", "2024-01-01")).toBe(1); // 1 day
    });
  });

  describe("Randomized oracle stress test (100 pseudo-random timestamps)", () => {
    it("generates consistent DD/MM/YYYY and DD/MM/YYYY HH:mm for 100 arbitrary timestamps", () => {
      const baseMs = new Date("2000-01-01T00:00:00Z").getTime();
      const maxMs = new Date("2050-01-01T00:00:00Z").getTime();

      for (let i = 0; i < 100; i++) {
        // Deterministic pseudo-random seed
        const timestamp = baseMs + ((i * 1234567891) % (maxMs - baseMs));
        const d = new Date(timestamp);

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        const expectedDate = `${day}/${month}/${year}`;
        const expectedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;

        expect(formatDate(d)).toBe(expectedDate);
        expect(formatDateLocalized(d)).toBe(expectedDate);
        expect(formatDateTime(d)).toBe(expectedDateTime);
      }
    });
  });
});
