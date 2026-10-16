import { describe, it, expect } from "vitest";
import {
  transformCreateUserCommand,
  transformUpdateUserCommand,
  transformUserListItem,
  transformUserProfile,
  transformUserListResponse,
} from "../user.transformer";
import type { CreateUserCommand, UpdateUserCommand } from "@/types";
import { createMockUserDTO } from "@/test/fixtures/user-fixtures";

describe("transformCreateUserCommand", () => {
  it("should transform all fields from camelCase to snake_case", () => {
    const command: CreateUserCommand = {
      email: "newuser@example.com",
      username: "newuser",
      role: "admin",
      creditBalance: 50,
    };

    const result = transformCreateUserCommand(command);

    expect(result).toEqual({
      email: "newuser@example.com",
      username: "newuser",
      role: "admin",
      credit_balance: 50,
    });
  });

  it("should default creditBalance to 0 when undefined", () => {
    const command: CreateUserCommand = {
      email: "newuser@example.com",
      username: "newuser",
      role: "user",
    };

    const result = transformCreateUserCommand(command);

    expect(result.credit_balance).toBe(0);
  });
});

describe("transformUpdateUserCommand", () => {
  it.each([
    [{ email: "updated@example.com" }, { email: "updated@example.com" }],
    [{ creditBalance: 200 }, { credit_balance: 200 }],
    [{ creditBalance: 0 }, { credit_balance: 0 }],
    [
      { email: "updated@example.com", role: "admin", creditBalance: 150 },
      { email: "updated@example.com", role: "admin", credit_balance: 150 },
    ],
    [{}, {}],
  ])("transforms update command %j", (command, expected) => {
    expect(transformUpdateUserCommand(command as UpdateUserCommand)).toEqual(expected);
  });
});

describe("transformUserListItem", () => {
  it("should transform snake_case DTO to camelCase frontend type", () => {
    const dto = createMockUserDTO();

    const result = transformUserListItem(dto);

    expect(result).toEqual({
      id: "user-uuid-123",
      email: "test@example.com",
      username: "testuser",
      role: "user",
      creditBalance: 100,
      isEnabled: true,
      createdAt: "2024-01-15T10:30:00Z",
    });
  });
});

describe("transformUserProfile", () => {
  it("should transform DTO to UserProfile including updatedAt", () => {
    const dto = createMockUserDTO();

    const result = transformUserProfile(dto);

    expect(result).toEqual({
      id: "user-uuid-123",
      email: "test@example.com",
      username: "testuser",
      role: "user",
      creditBalance: 100,
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-06-20T14:45:00Z",
    });
  });

  it("should handle null updatedAt", () => {
    const dto = createMockUserDTO({ updated_at: null });

    const result = transformUserProfile(dto);

    expect(result.updatedAt).toBeNull();
  });
});

describe("transformUserListResponse", () => {
  it("should transform paginated response with users", () => {
    const dto = {
      users: [
        createMockUserDTO({ id: "user-1", username: "user1" }),
        createMockUserDTO({ id: "user-2", username: "user2", role: "admin" }),
      ],
      pagination: {
        page: 2,
        per_page: 10,
        total_items: 25,
        total_pages: 3,
      },
    };

    const result = transformUserListResponse(dto);

    expect(result.users).toHaveLength(2);
    expect(result.users[0].username).toBe("user1");
    expect(result.users[1].role).toBe("admin");
    expect(result.pagination).toEqual({
      page: 2,
      perPage: 10,
      totalItems: 25,
      totalPages: 3,
    });
  });

  it.each([
    ["empty users array", { users: [], pagination: { total_items: 0, total_pages: 0 } }],
    [
      "null users array",
      { users: null, pagination: { page: 1, per_page: 25, total_items: 0, total_pages: 0 } },
    ],
  ])("should handle %s gracefully", (_, dto) => {
    const result = transformUserListResponse(dto);
    expect(result.users).toEqual([]);
  });

  it("should use defaults when pagination fields are missing", () => {
    const dto = { users: [], pagination: {} };

    const result = transformUserListResponse(dto);

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.perPage).toBe(25);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});
