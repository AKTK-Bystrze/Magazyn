import { describe, it, expect } from "vitest";
import {
  transformCreditRequest,
  transformCreditRequestList,
  transformLeaderboard,
  transformCreateCommand,
  transformUpdateCommand,
  transformReviewCommand,
} from "../credit-request.transformer";
import type {
  CreateCreditRequestCommand,
  UpdateCreditRequestCommand,
  ReviewCreditRequestCommand,
} from "@/types";

describe("credit-request.transformer", () => {
  describe("transformCreditRequest", () => {
    it("should transform snake_case DTO to camelCase CreditRequest", () => {
      const dto = {
        id: "req-1",
        title: "Test Request",
        description: "Need help moving boxes",
        credits_value: 10,
        requestor_id: "user-1",
        user_helped_id: "user-2",
        status: "awaiting",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        helpers: ["user-3"],
      };

      const result = transformCreditRequest(dto);

      expect(result).toEqual({
        id: "req-1",
        title: "Test Request",
        description: "Need help moving boxes",
        creditsValue: 10,
        requestorId: "user-1",
        userHelpedId: "user-2",
        status: "awaiting",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        helpers: ["user-3"],
      });
    });
  });

  describe("transformCreditRequestList", () => {
    it("should transform response with pagination", () => {
      const data = {
        requests: [
          {
            id: "req-1",
            title: "Task 1",
            description: "Desc",
            credits_value: 5,
            requestor_id: "u1",
            user_helped_id: null,
            status: "approved",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            helpers: [],
          },
        ],
        pagination: {
          page: 1,
          per_page: 25,
          total_items: 1,
          total_pages: 1,
        },
      };

      const result = transformCreditRequestList(data);

      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].id).toBe("req-1");
      expect(result.pagination.totalItems).toBe(1);
    });

    it("should handle empty or null data safely", () => {
      const result = transformCreditRequestList({});

      expect(result.requests).toEqual([]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalItems).toBe(0);
    });
  });

  describe("transformLeaderboard", () => {
    it("should transform leaderboard DTOs to LeaderboardItem array", () => {
      const data = [
        {
          user_id: "u1",
          username: "Alice",
          total_credits: 50,
        },
      ];

      const result = transformLeaderboard(data);

      expect(result).toEqual([
        {
          userId: "u1",
          username: "Alice",
          totalCredits: 50,
        },
      ]);
    });
  });

  describe("transformCreateCommand", () => {
    it("should map fields to snake_case payload", () => {
      const cmd: CreateCreditRequestCommand = {
        title: "Clean workshop",
        description: "Help sweep floors",
        creditsValue: 15,
        userHelpedId: "u-target",
        helpers: ["u-helper1"],
      };

      const result = transformCreateCommand(cmd);

      expect(result).toEqual({
        title: "Clean workshop",
        description: "Help sweep floors",
        credits_value: 15,
        user_helped_id: "u-target",
        helpers: ["u-helper1"],
      });
    });
  });

  describe("transformUpdateCommand", () => {
    it("should map userHelpedId to snake_case user_helped_id for backend API", () => {
      const cmd: UpdateCreditRequestCommand = {
        userHelpedId: "u-helped-123",
        creditsValue: 20,
      };

      const result = transformUpdateCommand(cmd);

      expect(result).toEqual({
        user_helped_id: "u-helped-123",
        credits_value: 20,
      });
      expect(result).not.toHaveProperty("userHelpedId");
    });

    it("should map all optional fields correctly when present", () => {
      const cmd: UpdateCreditRequestCommand = {
        title: "Updated Title",
        description: "Updated Desc",
        creditsValue: 30,
        userHelpedId: "u-helped",
        helpers: ["h1", "h2"],
      };

      const result = transformUpdateCommand(cmd);

      expect(result).toEqual({
        title: "Updated Title",
        description: "Updated Desc",
        credits_value: 30,
        user_helped_id: "u-helped",
        helpers: ["h1", "h2"],
      });
    });
  });

  describe("transformReviewCommand", () => {
    it("should map status and optional fields", () => {
      const cmd: ReviewCreditRequestCommand = {
        status: "approved",
        creditsValue: 25,
      };

      const result = transformReviewCommand(cmd);

      expect(result).toEqual({
        status: "approved",
        credits_value: 25,
      });
    });
  });
});
