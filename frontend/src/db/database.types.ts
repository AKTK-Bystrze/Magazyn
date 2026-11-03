export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      credit_history: {
        Row: {
          amount: number;
          author_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          reason: Database["public"]["Enums"]["credit_transaction_reason"];
          reservation_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          author_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          reason: Database["public"]["Enums"]["credit_transaction_reason"];
          reservation_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          author_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          reason?: Database["public"]["Enums"]["credit_transaction_reason"];
          reservation_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_history_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_history_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_request_helpers: {
        Row: {
          credit_request_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          credit_request_id: string;
          user_id: string;
        };
        Update: {
          credit_request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_request_helpers_credit_request_id_fkey";
            columns: ["credit_request_id"];
            isOneToOne: false;
            referencedRelation: "credit_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_request_helpers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_requests: {
        Row: {
          created_at: string;
          credits_value: number;
          description: string | null;
          id: string;
          requestor_id: string | null;
          status: Database["public"]["Enums"]["credit_request_status"];
          title: string;
          updated_at: string;
          user_helped_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          credits_value: number;
          description?: string | null;
          id?: string;
          requestor_id?: string | null;
          status?: Database["public"]["Enums"]["credit_request_status"];
          title: string;
          updated_at?: string;
          user_helped_id?: string | null;
        };
        Update: {
          created_at?: string;
          credits_value?: number;
          description?: string | null;
          id?: string;
          requestor_id?: string | null;
          status?: Database["public"]["Enums"]["credit_request_status"];
          title?: string;
          updated_at?: string;
          user_helped_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credit_requests_requestor_id_fkey";
            columns: ["requestor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_requests_user_helped_id_fkey";
            columns: ["user_helped_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          internal_id: string;
          is_archived: boolean;
          name: string | null;
          status: Database["public"]["Enums"]["equipment_status"];
          type_id: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          internal_id: string;
          is_archived?: boolean;
          name?: string | null;
          status?: Database["public"]["Enums"]["equipment_status"];
          type_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          internal_id?: string;
          is_archived?: boolean;
          name?: string | null;
          status?: Database["public"]["Enums"]["equipment_status"];
          type_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_type_id_fkey";
            columns: ["type_id"];
            isOneToOne: false;
            referencedRelation: "equipment_types";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment_types: {
        Row: {
          created_at: string;
          credit_cost_per_day: number;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          credit_cost_per_day: number;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          credit_cost_per_day?: number;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      maintenance_logs: {
        Row: {
          admin_id: string | null;
          created_at: string;
          equipment_id: string;
          id: string;
          new_status: Database["public"]["Enums"]["equipment_status"];
          notes: string | null;
          previous_status: Database["public"]["Enums"]["equipment_status"] | null;
        };
        ComputedFields: never;
        Insert: {
          admin_id?: string | null;
          created_at?: string;
          equipment_id: string;
          id?: string;
          new_status: Database["public"]["Enums"]["equipment_status"];
          notes?: string | null;
          previous_status?: Database["public"]["Enums"]["equipment_status"] | null;
        };
        Update: {
          admin_id?: string | null;
          created_at?: string;
          equipment_id?: string;
          id?: string;
          new_status?: Database["public"]["Enums"]["equipment_status"];
          notes?: string | null;
          previous_status?: Database["public"]["Enums"]["equipment_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_logs_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          credit_balance: number;
          email: string;
          id: string;
          is_enabled: boolean;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string | null;
          username: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          credit_balance?: number;
          email: string;
          id: string;
          is_enabled?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
          username: string;
        };
        Update: {
          created_at?: string;
          credit_balance?: number;
          email?: string;
          id?: string;
          is_enabled?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
          username?: string;
        };
        Relationships: [];
      };
      reservation_history: {
        Row: {
          changed_by_user_id: string | null;
          created_at: string;
          end_date: string;
          equipment_id: string;
          id: string;
          reservation_id: string;
          start_date: string;
          status: Database["public"]["Enums"]["reservation_status"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          changed_by_user_id?: string | null;
          created_at?: string;
          end_date: string;
          equipment_id: string;
          id?: string;
          reservation_id: string;
          start_date: string;
          status: Database["public"]["Enums"]["reservation_status"];
          user_id: string;
        };
        Update: {
          changed_by_user_id?: string | null;
          created_at?: string;
          end_date?: string;
          equipment_id?: string;
          id?: string;
          reservation_id?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_history_changed_by_user_id_fkey";
            columns: ["changed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_history_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_history_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          created_at: string;
          end_date: string;
          equipment_id: string;
          id: string;
          is_free: boolean;
          start_date: string;
          status: Database["public"]["Enums"]["reservation_status"];
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          end_date: string;
          equipment_id: string;
          id?: string;
          is_free?: boolean;
          start_date: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          equipment_id?: string;
          id?: string;
          is_free?: boolean;
          start_date?: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bulk_adjust_user_credits: {
        Args: {
          p_admin_id: string;
          p_amount: number;
          p_description: string;
          p_reason: string;
          p_user_ids: string[];
        };
        Returns: undefined;
      };
      bulk_update_reservations_status: {
        Args: { p_admin_id: string; p_reservation_ids: string[]; p_status: string };
        Returns: Json;
      };
      create_credit_request_atomic: {
        Args: {
          p_credits_value: number;
          p_description: string;
          p_helpers: string[];
          p_requestor_id: string;
          p_title: string;
          p_user_helped_id: string;
        };
        Returns: Json;
      };
      create_reservation_atomic: {
        Args: {
          p_created_by_user_id: string;
          p_is_free: boolean;
          p_reservations: Json;
          p_total_cost: number;
          p_user_id: string;
        };
        Returns: Json;
      };
      get_credit_leaderboard: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_credits: number;
          user_id: string;
          username: string;
        }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_enabled: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      modify_reservation_dates_with_credits: {
        Args: {
          p_allow_negative?: boolean;
          p_changed_by_user_id: string;
          p_new_end_date: string;
          p_new_start_date: string;
          p_reservation_id: string;
        };
        Returns: Json;
      };
      refund_reservation_credits: {
        Args: { p_amount: number; p_reservation_id: string };
        Returns: undefined;
      };
      review_credit_request_atomic: {
        Args: {
          p_admin_id: string;
          p_credits_value?: number;
          p_description?: string;
          p_helpers?: string[];
          p_id: string;
          p_reason?: string;
          p_status: string;
        };
        Returns: undefined;
      };
      update_credit_request_atomic: {
        Args: {
          p_credits_value: number;
          p_description: string;
          p_helpers: string[];
          p_id: string;
          p_status: string;
          p_title: string;
          p_user_helped_id: string;
        };
        Returns: undefined;
      };
      update_reservation_with_audit: {
        Args: {
          p_changed_by_user_id: string;
          p_end_date?: string;
          p_reservation_id: string;
          p_start_date?: string;
          p_status?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      credit_request_status: "awaiting" | "approved" | "rejected" | "approved with changes";
      credit_transaction_reason:
        | "reservation_charge"
        | "reservation_refund"
        | "reservation_adjustment"
        | "admin_adjustment"
        | "work_credit";
      equipment_status: "ok" | "broken" | "blocked";
      reservation_status: "PENDING" | "RENTED" | "RETURNED" | "CANCELLED";
      user_role: "user" | "admin" | "super_admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      credit_request_status: ["awaiting", "approved", "rejected", "approved with changes"],
      credit_transaction_reason: [
        "reservation_charge",
        "reservation_refund",
        "reservation_adjustment",
        "admin_adjustment",
        "work_credit",
      ],
      equipment_status: ["ok", "broken", "blocked"],
      reservation_status: ["PENDING", "RENTED", "RETURNED", "CANCELLED"],
      user_role: ["user", "admin", "super_admin"],
    },
  },
} as const;
