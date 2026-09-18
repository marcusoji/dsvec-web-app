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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          applicant_id: string | null
          application_number: string | null
          created_at: string
          detail: string | null
          email_masked: string | null
          event_type: string
          id: number
          phone_masked: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          applicant_id?: string | null
          application_number?: string | null
          created_at?: string
          detail?: string | null
          email_masked?: string | null
          event_type: string
          id?: number
          phone_masked?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          applicant_id?: string | null
          application_number?: string | null
          created_at?: string
          detail?: string | null
          email_masked?: string | null
          event_type?: string
          id?: number
          phone_masked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_documents: {
        Row: {
          applicant_id: string
          bucket: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          applicant_id: string
          bucket?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          applicant_id?: string
          bucket?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_documents_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      applicants: {
        Row: {
          access_token: string
          address: string
          admin_notes: string | null
          application_number: string
          created_at: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id: string
          last_name: string
          local_government: string
          middle_name: string | null
          nationality: string
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          phone: string
          qualification: string | null
          school: string | null
          school_year: string | null
          state: string
          status: Database["public"]["Enums"]["application_status"]
          stream: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          address: string
          admin_notes?: string | null
          application_number?: string
          created_at?: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id?: string
          last_name: string
          local_government: string
          middle_name?: string | null
          nationality?: string
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          phone: string
          qualification?: string | null
          school?: string | null
          school_year?: string | null
          state: string
          status?: Database["public"]["Enums"]["application_status"]
          stream?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          address?: string
          admin_notes?: string | null
          application_number?: string
          created_at?: string
          date_of_birth?: string
          email?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          local_government?: string
          middle_name?: string | null
          nationality?: string
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          phone?: string
          qualification?: string | null
          school?: string | null
          school_year?: string | null
          state?: string
          status?: Database["public"]["Enums"]["application_status"]
          stream?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          must_change_password: boolean
          password_changed_at: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_scores: {
        Row: {
          applicant_id: string
          created_at: string
          exam_score: number | null
          recorded_by: string | null
          recorded_by_email: string | null
          test_score: number | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          exam_score?: number | null
          recorded_by?: string | null
          recorded_by_email?: string | null
          test_score?: number | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          exam_score?: number | null
          recorded_by?: string | null
          recorded_by_email?: string | null
          test_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_scores_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: true
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          careers: string[]
          contact_email: string | null
          contact_phone: string | null
          coordinator_name: string | null
          created_at: string
          description: string
          duration: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          office_location: string | null
          requirements: string[]
          skills: string[]
          slug: string
          sort_order: number
          summary: string
          updated_at: string
        }
        Insert: {
          careers?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          coordinator_name?: string | null
          created_at?: string
          description?: string
          duration?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          office_location?: string | null
          requirements?: string[]
          skills?: string[]
          slug: string
          sort_order?: number
          summary?: string
          updated_at?: string
        }
        Update: {
          careers?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          coordinator_name?: string | null
          created_at?: string
          description?: string
          duration?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          office_location?: string | null
          requirements?: string[]
          skills?: string[]
          slug?: string
          sort_order?: number
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_access_applicant: {
        Args: {
          _applicant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_application_number: { Args: never; Returns: string }
      staff_unit_id: {
        Args: {
          _user_id: string
        }
        Returns: string | null
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "reviewer" | "registrar"
      application_status:
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "admitted"
        | "rejected"
        | "withdrawn"
      document_kind: "photograph"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff", "reviewer", "registrar"],
      application_status: [
        "submitted",
        "under_review",
        "shortlisted",
        "admitted",
        "rejected",
        "withdrawn",
      ],
      document_kind: ["photograph"],
    },
  },
} as const
