export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      credit_history: {
        Row: {
          admin_id: string | null;
          amount: number;
          created_at: string;
          description: string | null;
          id: string;
          reason: Database["public"]["Enums"]["credit_transaction_reason"];
          reservation_id: string | null;
          user_id: string;
        };
        Insert: {
          admin_id?: string | null;
          amount: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          reason: Database["public"]["Enums"]["credit_transaction_reason"];
          reservation_id?: string | null;
          user_id: string;
        };
        Update: {
          admin_id?: string | null;
          amount?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          reason?: Database["public"]["Enums"]["credit_transaction_reason"];
          reservation_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_history_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "credit_history_admin_id_fkey";
            columns: ["admin_id"];
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
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
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
      credit_requests: {
        Row: {
          admin_id: string | null;
          admin_note: string | null;
          amount: number;
          created_at: string;
          description: string;
          id: string;
          status: Database["public"]["Enums"]["credit_request_status"];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          admin_id?: string | null;
          admin_note?: string | null;
          amount: number;
          created_at?: string;
          description: string;
          id?: string;
          status?: Database["public"]["Enums"]["credit_request_status"];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          admin_id?: string | null;
          admin_note?: string | null;
          amount?: number;
          created_at?: string;
          description?: string;
          id?: string;
          status?: Database["public"]["Enums"]["credit_request_status"];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_requests_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "credit_requests_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "credit_requests_user_id_fkey";
            columns: ["user_id"];
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
          previous_status:
            | Database["public"]["Enums"]["equipment_status"]
            | null;
        };
        Insert: {
          admin_id?: string | null;
          created_at?: string;
          equipment_id: string;
          id?: string;
          new_status: Database["public"]["Enums"]["equipment_status"];
          notes?: string | null;
          previous_status?:
            | Database["public"]["Enums"]["equipment_status"]
            | null;
        };
        Update: {
          admin_id?: string | null;
          created_at?: string;
          equipment_id?: string;
          id?: string;
          new_status?: Database["public"]["Enums"]["equipment_status"];
          notes?: string | null;
          previous_status?:
            | Database["public"]["Enums"]["equipment_status"]
            | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
          },
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
            referencedRelation: "analytics_equipment_stats";
            referencedColumns: ["equipment_id"];
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
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string | null;
          username: string;
        };
        Insert: {
          created_at?: string;
          credit_balance?: number;
          email: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
          username: string;
        };
        Update: {
          created_at?: string;
          credit_balance?: number;
          email?: string;
          id?: string;
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
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
          },
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
            referencedRelation: "analytics_equipment_stats";
            referencedColumns: ["equipment_id"];
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
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
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
          start_date: string;
          status: Database["public"]["Enums"]["reservation_status"];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          equipment_id: string;
          id?: string;
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
            referencedRelation: "analytics_equipment_stats";
            referencedColumns: ["equipment_id"];
          },
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
            referencedRelation: "analytics_user_stats";
            referencedColumns: ["user_id"];
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
      analytics_equipment_stats: {
        Row: {
          equipment_id: string | null;
          equipment_name: string | null;
          total_days_rented: number | null;
          total_reservations: number | null;
          utilization_rate: number | null;
        };
        Relationships: [];
      };
      analytics_user_stats: {
        Row: {
          last_reservation_date: string | null;
          total_credits_spent: number | null;
          total_reservations: number | null;
          user_id: string | null;
          username: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      credit_request_status: "PENDING" | "APPROVED" | "DENIED";
      credit_transaction_reason:
        | "reservation_charge"
        | "reservation_refund"
        | "reservation_adjustment"
        | "admin_adjustment"
        | "work_credit";
      equipment_status: "ok" | "broken" | "blocked";
      reservation_status: "PENDING" | "RENTED" | "RETURNED" | "DENIED";
      user_role: "user" | "admin" | "super_admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      credit_request_status: ["PENDING", "APPROVED", "DENIED"],
      credit_transaction_reason: [
        "reservation_charge",
        "reservation_refund",
        "reservation_adjustment",
        "admin_adjustment",
        "work_credit",
      ],
      equipment_status: ["ok", "broken", "blocked"],
      reservation_status: ["PENDING", "RENTED", "RETURNED", "DENIED"],
      user_role: ["user", "admin", "super_admin"],
    },
  },
} as const;
