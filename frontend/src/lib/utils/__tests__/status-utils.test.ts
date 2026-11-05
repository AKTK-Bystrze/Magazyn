import { describe, it, expect } from "vitest";
import { canChangeStatus } from "../status-utils";
import { RESERVATION_STATUS } from "@/lib/config/constants";

describe("status-utils", () => {
  describe("canChangeStatus", () => {
    describe("Owner permissions", () => {
      it("allows owner to cancel, mark returned, and pickup when status is PENDING", () => {
        const result = canChangeStatus(RESERVATION_STATUS.PENDING, true, false);
        expect(result.canCancel).toBe(true);
        expect(result.canMarkReturned).toBe(true);
        expect(result.canRent).toBe(true);
        expect(result.canChangeStatus).toBe(false);
      });

      it("allows owner to mark returned but NOT cancel or pickup when status is RENTED", () => {
        const result = canChangeStatus(RESERVATION_STATUS.RENTED, true, false);
        expect(result.canCancel).toBe(false);
        expect(result.canMarkReturned).toBe(true);
        expect(result.canRent).toBe(false);
        expect(result.canChangeStatus).toBe(false);
      });

      it("disallows all actions for owner when status is RETURNED (terminal)", () => {
        const result = canChangeStatus(RESERVATION_STATUS.RETURNED, true, false);
        expect(result.canCancel).toBe(false);
        expect(result.canMarkReturned).toBe(false);
        expect(result.canRent).toBe(false);
        expect(result.canChangeStatus).toBe(false);
        expect(result.availableStatuses).toEqual([]);
      });

      it("disallows all actions for owner when status is CANCELLED (terminal)", () => {
        const result = canChangeStatus(RESERVATION_STATUS.CANCELLED, true, false);
        expect(result.canCancel).toBe(false);
        expect(result.canMarkReturned).toBe(false);
        expect(result.canRent).toBe(false);
        expect(result.canChangeStatus).toBe(false);
        expect(result.availableStatuses).toEqual([]);
      });
    });

    describe("Admin permissions", () => {
      it("allows admin to cancel, mark returned, pickup, and change status when status is PENDING", () => {
        const result = canChangeStatus(RESERVATION_STATUS.PENDING, false, true);
        expect(result.canCancel).toBe(true);
        expect(result.canMarkReturned).toBe(true);
        expect(result.canRent).toBe(true);
        expect(result.canChangeStatus).toBe(true);
        expect(result.availableStatuses).toEqual([
          RESERVATION_STATUS.RENTED,
          RESERVATION_STATUS.RETURNED,
          RESERVATION_STATUS.CANCELLED,
        ]);
      });

      it("allows admin to mark returned when status is RENTED", () => {
        const result = canChangeStatus(RESERVATION_STATUS.RENTED, false, true);
        expect(result.canCancel).toBe(false);
        expect(result.canMarkReturned).toBe(true);
        expect(result.canRent).toBe(false);
        expect(result.canChangeStatus).toBe(true);
        expect(result.availableStatuses).toEqual([RESERVATION_STATUS.RETURNED]);
      });

      it("disallows all actions for admin when status is RETURNED (terminal)", () => {
        const result = canChangeStatus(RESERVATION_STATUS.RETURNED, false, true);
        expect(result.canCancel).toBe(false);
        expect(result.canMarkReturned).toBe(false);
        expect(result.canRent).toBe(false);
        expect(result.canChangeStatus).toBe(false);
        expect(result.availableStatuses).toEqual([]);
      });

      it("disallows all actions for admin when status is CANCELLED (terminal)", () => {
        const result = canChangeStatus(RESERVATION_STATUS.CANCELLED, false, true);
        expect(result.canCancel).toBe(false);
        expect(result.canMarkReturned).toBe(false);
        expect(result.canRent).toBe(false);
        expect(result.canChangeStatus).toBe(false);
        expect(result.availableStatuses).toEqual([]);
      });
    });

    describe("Non-owner user permissions", () => {
      it("disallows all actions for non-owner non-admin", () => {
        const pendingResult = canChangeStatus(RESERVATION_STATUS.PENDING, false, false);
        expect(pendingResult.canCancel).toBe(false);
        expect(pendingResult.canMarkReturned).toBe(false);
        expect(pendingResult.canRent).toBe(false);
        expect(pendingResult.canChangeStatus).toBe(false);

        const rentedResult = canChangeStatus(RESERVATION_STATUS.RENTED, false, false);
        expect(rentedResult.canCancel).toBe(false);
        expect(rentedResult.canMarkReturned).toBe(false);
        expect(rentedResult.canRent).toBe(false);
        expect(rentedResult.canChangeStatus).toBe(false);
      });
    });
  });
});
