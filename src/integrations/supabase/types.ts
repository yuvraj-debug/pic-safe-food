export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          allergies: string[]
          avoid_additives: boolean
          created_at: string
          diet_type: string
          health_conditions: string[]
          id: string
          low_sodium_preference: boolean
          low_sugar_preference: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          avoid_additives?: boolean
          created_at?: string
          diet_type?: string
          health_conditions?: string[]
          id?: string
          low_sodium_preference?: boolean
          low_sugar_preference?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          avoid_additives?: boolean
          created_at?: string
          diet_type?: string
          health_conditions?: string[]
          id?: string
          low_sodium_preference?: boolean
          low_sugar_preference?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      purchase_intents: {
        Row: {
          created_at: string
          id: string
          plan: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referred_id: string
          referred_rewarded: boolean
          referrer_id: string
          referrer_rewarded: boolean
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referred_rewarded?: boolean
          referrer_id: string
          referrer_rewarded?: boolean
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referred_rewarded?: boolean
          referrer_id?: string
          referrer_rewarded?: boolean
          status?: string
        }
        Relationships: []
      }
      referral_profiles: {
        Row: {
          created_at: string
          highest_milestone_reached: number
          id: string
          monthly_referral_reset_date: string
          monthly_referral_scans: number
          referral_code: string
          referral_count: number
          referral_rewards_scans: number
          referred_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          highest_milestone_reached?: number
          id?: string
          monthly_referral_reset_date?: string
          monthly_referral_scans?: number
          referral_code: string
          referral_count?: number
          referral_rewards_scans?: number
          referred_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          highest_milestone_reached?: number
          id?: string
          monthly_referral_reset_date?: string
          monthly_referral_scans?: number
          referral_code?: string
          referral_count?: number
          referral_rewards_scans?: number
          referred_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "referral_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scan_logs: {
        Row: {
          id: string
          scanned_at: string
          user_id: string
        }
        Insert: {
          id?: string
          scanned_at?: string
          user_id: string
        }
        Update: {
          id?: string
          scanned_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_results: {
        Row: {
          analysis: Json
          created_at: string
          id: string
          product_name: string
          safety_level: string
          safety_score: number
          thumbnail: string | null
          user_id: string
        }
        Insert: {
          analysis: Json
          created_at?: string
          id?: string
          product_name: string
          safety_level: string
          safety_score: number
          thumbnail?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          id?: string
          product_name?: string
          safety_level?: string
          safety_score?: number
          thumbnail?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scan_usage: {
        Row: {
          created_at: string
          id: string
          reset_date: string
          scan_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reset_date?: string
          scan_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reset_date?: string
          scan_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          id: string
          plan: Database["public"]["Enums"]["app_plan"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_referral: {
        Args: { _referred_user_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_plan"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_scan_count: { Args: { _user_id: string }; Returns: number }
      reset_scan_if_needed: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_plan: "free" | "basic" | "premium" | "pro" | "lifetime"
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_plan: ["free", "basic", "premium", "pro", "lifetime"],
      app_role: ["admin", "user"],
    },
  },
} as const
