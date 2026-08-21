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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      credit_cards: {
        Row: {
          created_at: string
          credit_limit: number
          current_balance: number
          due_day: number
          id: number
          issuer: string
          minimum_payment: number
          name: string
          statement_balance: number
          statement_day: number
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_limit: number
          current_balance?: number
          due_day: number
          id: number
          issuer?: string
          minimum_payment?: number
          name: string
          statement_balance?: number
          statement_day: number
          user_id: string
        }
        Update: {
          created_at?: string
          credit_limit?: number
          current_balance?: number
          due_day?: number
          id?: number
          issuer?: string
          minimum_payment?: number
          name?: string
          statement_balance?: number
          statement_day?: number
          user_id?: string
        }
        Relationships: []
      }
      debt_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          created_at: string
          credit_card_id: number | null
          debt_type: string
          description: string
          due_date: string
          effective_date: string
          id: number
          loan_id: number | null
          reverses_adjustment_id: number | null
          signed_amount: number
          source_transaction_id: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustment_type: string
          amount: number
          created_at?: string
          credit_card_id?: number | null
          debt_type: string
          description?: string
          due_date: string
          effective_date?: string
          id?: number
          loan_id?: number | null
          reverses_adjustment_id?: number | null
          source_transaction_id?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          created_at?: string
          credit_card_id?: number | null
          debt_type?: string
          description?: string
          due_date?: string
          effective_date?: string
          id?: number
          loan_id?: number | null
          reverses_adjustment_id?: number | null
          source_transaction_id?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          credit_card_id: number | null
          debt_type: string
          id: number
          legacy_due_key: string | null
          loan_id: number | null
          note: string
          payment_date: string
          source_account_key: string | null
          source_transaction_id: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_card_id?: number | null
          debt_type: string
          id?: number
          legacy_due_key?: string | null
          loan_id?: number | null
          note?: string
          payment_date?: string
          source_account_key?: string | null
          source_transaction_id?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_card_id?: number | null
          debt_type?: string
          id?: number
          legacy_due_key?: string | null
          loan_id?: number | null
          note?: string
          payment_date?: string
          source_account_key?: string | null
          source_transaction_id?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_reminder_deliveries: {
        Row: {
          due_date: string
          due_key: string
          id: number
          provider_message_id: string | null
          recipient_email: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          due_date: string
          due_key: string
          id?: number
          provider_message_id?: string | null
          recipient_email: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          due_date?: string
          due_key?: string
          id?: number
          provider_message_id?: string | null
          recipient_email?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          balance: number
          created_at: string
          due: string
          id: number
          lender: string
          monthly: number
          name: string
          original: number
          user_id: string
        }
        Insert: {
          balance: number
          created_at?: string
          due: string
          id: number
          lender?: string
          monthly?: number
          name: string
          original: number
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          due?: string
          id?: number
          lender?: string
          monthly?: number
          name?: string
          original?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          plan: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          plan?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          plan?: string
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          adjustment_id: number | null
          amount: number
          component: string
          created_at: string
          id: number
          payment_id: number
          user_id: string
        }
        Insert: {
          adjustment_id?: number | null
          amount: number
          component: string
          created_at?: string
          id?: number
          payment_id: number
          user_id: string
        }
        Update: {
          adjustment_id?: number | null
          amount?: number
          component?: string
          created_at?: string
          id?: number
          payment_id?: number
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: number
          kind: string
          note: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          id: number
          kind: string
          note?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: number
          kind?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_debt_adjustment: {
        Args: {
          p_adjustment_type: string
          p_amount: number
          p_debt_id: number
          p_debt_type: string
          p_description: string
          p_due_date: string
          p_effective_date: string
          p_reverses_adjustment_id?: number | null
          p_transaction_category: string
          p_transaction_id: number
          p_transaction_note: string
          p_user_id: string
        }
        Returns: Json
      }
      record_debt_payment: {
        Args: {
          p_advanced_due_date?: string | null
          p_amount: number
          p_debt_id: number
          p_debt_type: string
          p_due_date: string
          p_payment_date: string
          p_source_account_key: string
          p_transaction_category: string
          p_transaction_id: number
          p_transaction_note: string
          p_user_id: string
        }
        Returns: Json
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
