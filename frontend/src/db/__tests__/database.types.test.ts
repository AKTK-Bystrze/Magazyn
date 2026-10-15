import { describe, it, expect, expectTypeOf } from "vitest";
import type { Database } from "../database.types";
import { transformCreditHistoryItem } from "@/lib/transformers/credit.transformer";
import { transformUserListItem } from "@/lib/transformers/user.transformer";

describe("Database Types - Milestone 2 Empirical Type Safety & Relationship Mapping", () => {
  type Tables = Database["public"]["Tables"];
  type CreditHistory = Tables["credit_history"];
  type Profiles = Tables["profiles"];
  type MaintenanceLogs = Tables["maintenance_logs"];

  describe("credit_history table schema & relationships", () => {
    it("credit_history Row includes author_id and excludes admin_id", () => {
      type Row = CreditHistory["Row"];

      // 1. author_id must exist and be string | null
      expectTypeOf<Row["author_id"]>().toEqualTypeOf<string | null>();

      // 2. admin_id must NOT exist on credit_history Row
      expectTypeOf<Row>().not.toHaveProperty("admin_id");

      const sampleRow: Row = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        user_id: "123e4567-e89b-12d3-a456-426614174001",
        amount: 50,
        reason: "work_credit",
        description: "Community cleanup",
        reservation_id: null,
        author_id: "123e4567-e89b-12d3-a456-426614174002",
        created_at: "2026-10-15T12:00:00Z",
      };

      expect(sampleRow.author_id).toBe("123e4567-e89b-12d3-a456-426614174002");
      expect((sampleRow as Record<string, unknown>).admin_id).toBeUndefined();
    });

    it("credit_history Insert and Update support author_id and exclude admin_id", () => {
      type Insert = CreditHistory["Insert"];
      type Update = CreditHistory["Update"];

      // Insert tests
      expectTypeOf<Insert["author_id"]>().toEqualTypeOf<string | null | undefined>();
      expectTypeOf<Insert>().not.toHaveProperty("admin_id");

      // Update tests
      expectTypeOf<Update["author_id"]>().toEqualTypeOf<string | null | undefined>();
      expectTypeOf<Update>().not.toHaveProperty("admin_id");

      const sampleInsert: Insert = {
        user_id: "user-1",
        amount: 25,
        reason: "admin_adjustment",
        author_id: "admin-1",
      };

      const sampleUpdate: Update = {
        author_id: null,
      };

      expect(sampleInsert.author_id).toBe("admin-1");
      expect(sampleUpdate.author_id).toBeNull();
      expect((sampleInsert as Record<string, unknown>).admin_id).toBeUndefined();
    });

    it("credit_history relationships correctly map author_id and exclude admin_id", () => {
      type Relationships = CreditHistory["Relationships"];

      type ProfilesRel = Extract<
        Relationships[number],
        { foreignKeyName: "credit_history_author_id_fkey"; referencedRelation: "profiles" }
      >;
      type StatsRel = Extract<
        Relationships[number],
        {
          foreignKeyName: "credit_history_author_id_fkey";
          referencedRelation: "analytics_user_stats";
        }
      >;

      expectTypeOf<ProfilesRel["columns"]>().toEqualTypeOf<["author_id"]>();
      expectTypeOf<ProfilesRel["referencedColumns"]>().toEqualTypeOf<["id"]>();
      expectTypeOf<StatsRel["columns"]>().toEqualTypeOf<["author_id"]>();
      expectTypeOf<StatsRel["referencedColumns"]>().toEqualTypeOf<["user_id"]>();

      type AdminIdRel = Extract<Relationships[number], { columns: ["admin_id"] }>;
      expectTypeOf<AdminIdRel>().toBeNever();
    });
  });

  describe("profiles table schema", () => {
    it("profiles Row strictly requires is_enabled as boolean", () => {
      type Row = Profiles["Row"];

      expectTypeOf<Row["is_enabled"]>().toEqualTypeOf<boolean>();

      const profileRow: Row = {
        id: "user-uuid",
        email: "user@example.com",
        username: "testuser",
        role: "user",
        credit_balance: 100,
        is_enabled: true,
        created_at: "2026-10-15T12:00:00Z",
        updated_at: null,
      };

      expect(profileRow.is_enabled).toBe(true);
    });

    it("profiles Insert and Update have optional is_enabled", () => {
      type Insert = Profiles["Insert"];
      type Update = Profiles["Update"];

      expectTypeOf<Insert["is_enabled"]>().toEqualTypeOf<boolean | undefined>();
      expectTypeOf<Update["is_enabled"]>().toEqualTypeOf<boolean | undefined>();

      const insertWithoutEnabled: Insert = {
        id: "user-uuid",
        email: "user@example.com",
        username: "testuser",
      };

      const updateEnabled: Update = {
        is_enabled: false,
      };

      expect(insertWithoutEnabled.is_enabled).toBeUndefined();
      expect(updateEnabled.is_enabled).toBe(false);
    });
  });

  describe("DTO and Transformer End-to-End Alignment", () => {
    it("transformCreditHistoryItem correctly accepts author_id and produces authorId", () => {
      const dto = {
        id: "h-1",
        user_id: "u-1",
        username: "test_member",
        amount: -20,
        reason: "reservation_charge",
        description: "Charge for tent",
        reservation_id: "res-1",
        author_id: "admin-uuid-99",
        author_username: "admin_alice",
        created_at: "2026-10-15T10:00:00Z",
      };

      const transformed = transformCreditHistoryItem(dto);

      expect(transformed.authorId).toBe("admin-uuid-99");
      expect(transformed.authorUsername).toBe("admin_alice");
      expect((transformed as Record<string, unknown>).adminId).toBeUndefined();
    });

    it("transformUserListItem correctly maps is_enabled to isEnabled", () => {
      const userDTO = {
        id: "u-1",
        email: "u1@example.com",
        username: "u1",
        role: "user" as const,
        credit_balance: 50,
        is_enabled: true,
        created_at: "2026-10-15T10:00:00Z",
        updated_at: null,
      };

      const transformed = transformUserListItem(userDTO);
      expect(transformed.isEnabled).toBe(true);
    });
  });

  describe("Regression Protection: maintenance_logs preserves legitimate admin_id", () => {
    it("maintenance_logs Row, Insert, and Relationships still reference admin_id", () => {
      type Row = MaintenanceLogs["Row"];
      type Relationships = MaintenanceLogs["Relationships"];

      expectTypeOf<Row["admin_id"]>().toEqualTypeOf<string | null>();

      type AdminRel = Extract<
        Relationships[number],
        { foreignKeyName: "maintenance_logs_admin_id_fkey"; referencedRelation: "profiles" }
      >;
      expectTypeOf<AdminRel["columns"]>().toEqualTypeOf<["admin_id"]>();

      const logRow: Row = {
        id: "log-1",
        equipment_id: "eq-1",
        previous_status: "ok",
        new_status: "broken",
        notes: "Broken handle",
        admin_id: "admin-1",
        created_at: "2026-10-15T10:00:00Z",
      };

      expect(logRow.admin_id).toBe("admin-1");
    });
  });
});
