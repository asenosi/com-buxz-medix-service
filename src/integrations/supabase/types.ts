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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      caregiver_access: {
        Row: {
          access_level: string
          caregiver_user_id: string
          granted_at: string
          id: string
          patient_user_id: string
        }
        Insert: {
          access_level?: string
          caregiver_user_id: string
          granted_at?: string
          id?: string
          patient_user_id: string
        }
        Update: {
          access_level?: string
          caregiver_user_id?: string
          granted_at?: string
          id?: string
          patient_user_id?: string
        }
        Relationships: []
      }
      dose_logs: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          notes: string | null
          schedule_id: string
          scheduled_time: string
          snooze_until: string | null
          status: string
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          notes?: string | null
          schedule_id: string
          scheduled_time: string
          snooze_until?: string | null
          status?: string
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          notes?: string | null
          schedule_id?: string
          scheduled_time?: string
          snooze_until?: string | null
          status?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dose_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dose_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "medication_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_schedules: {
        Row: {
          active: boolean | null
          created_at: string
          days_of_week: number[] | null
          id: string
          medication_id: string
          special_instructions: string | null
          time_of_day: string
          with_food: boolean | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          medication_id: string
          special_instructions?: string | null
          time_of_day: string
          with_food?: boolean | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          medication_id?: string
          special_instructions?: string | null
          time_of_day?: string
          with_food?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_schedules_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean | null
          created_at: string
          dosage: string
          end_date: string | null
          form: string | null
          id: string
          image_url: string | null
          instructions: string | null
          medication_color: string | null
          medication_icon: string | null
          name: string
          pills_remaining: number | null
          prescribing_doctor: string | null
          reason_for_taking: string | null
          refill_reminder_threshold: number | null
          refills_remaining: number | null
          route_of_administration: string | null
          start_date: string | null
          total_pills: number | null
          treatment_duration_days: number | null
          updated_at: string
          user_id: string
          with_food_timing: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          dosage: string
          end_date?: string | null
          form?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          medication_color?: string | null
          medication_icon?: string | null
          name: string
          pills_remaining?: number | null
          prescribing_doctor?: string | null
          reason_for_taking?: string | null
          refill_reminder_threshold?: number | null
          refills_remaining?: number | null
          route_of_administration?: string | null
          start_date?: string | null
          total_pills?: number | null
          treatment_duration_days?: number | null
          updated_at?: string
          user_id: string
          with_food_timing?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          dosage?: string
          end_date?: string | null
          form?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          medication_color?: string | null
          medication_icon?: string | null
          name?: string
          pills_remaining?: number | null
          prescribing_doctor?: string | null
          reason_for_taking?: string | null
          refill_reminder_threshold?: number | null
          refills_remaining?: number | null
          route_of_administration?: string | null
          start_date?: string | null
          total_pills?: number | null
          treatment_duration_days?: number | null
          updated_at?: string
          user_id?: string
          with_food_timing?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          is_caregiver: boolean | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          is_caregiver?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          is_caregiver?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
