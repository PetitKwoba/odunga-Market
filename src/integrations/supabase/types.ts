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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      document_requests: {
        Row: {
          description: string | null
          document_name: string
          fulfilled: boolean
          id: string
          requested_at: string
          user_id: string
        }
        Insert: {
          description?: string | null
          document_name: string
          fulfilled?: boolean
          id?: string
          requested_at?: string
          user_id: string
        }
        Update: {
          description?: string | null
          document_name?: string
          fulfilled?: boolean
          id?: string
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          producer_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          producer_id: string
          product_id: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          producer_id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          payment_status: string
          shipping_address: Json
          status: string
          total_amount: number
          updated_at: string
          wholesaler_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_status?: string
          shipping_address?: Json
          status?: string
          total_amount?: number
          updated_at?: string
          wholesaler_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_status?: string
          shipping_address?: Json
          status?: string
          total_amount?: number
          updated_at?: string
          wholesaler_id?: string
        }
        Relationships: []
      }
      producer_profiles: {
        Row: {
          categories: string[] | null
          id: string
          logo_url: string | null
          minimum_order_rules: string | null
          referral_reward_type: string
          referral_reward_value: number
          shipping_regions: string[] | null
          user_id: string
        }
        Insert: {
          categories?: string[] | null
          id?: string
          logo_url?: string | null
          minimum_order_rules?: string | null
          referral_reward_type?: string
          referral_reward_value?: number
          shipping_regions?: string[] | null
          user_id: string
        }
        Update: {
          categories?: string[] | null
          id?: string
          logo_url?: string | null
          minimum_order_rules?: string | null
          referral_reward_type?: string
          referral_reward_value?: number
          shipping_regions?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      product_referral_sales: {
        Row: {
          commission_earned: number
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          referrer_user_id: string
          subtotal: number
        }
        Insert: {
          commission_earned?: number
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          referrer_user_id: string
          subtotal?: number
        }
        Update: {
          commission_earned?: number
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          referrer_user_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_referral_sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_referral_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          bulk_pricing: Json | null
          category: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          lead_time_days: number
          moq: number
          name: string
          producer_id: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          base_price?: number
          bulk_pricing?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          lead_time_days?: number
          moq?: number
          name: string
          producer_id: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          bulk_pricing?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          lead_time_days?: number
          moq?: number
          name?: string
          producer_id?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bio: string | null
          business_name: string | null
          city: string | null
          country: string
          created_at: string
          email: string
          id: string
          industry: string | null
          is_approved: boolean
          is_verified: boolean
          name: string
          payout_method: string | null
          phone: string | null
          referral_code: string
          referral_credits: number
          referred_by_user_id: string | null
          registration_number: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bio?: string | null
          business_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          is_approved?: boolean
          is_verified?: boolean
          name: string
          payout_method?: string | null
          phone?: string | null
          referral_code: string
          referral_credits?: number
          referred_by_user_id?: string | null
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bio?: string | null
          business_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          is_approved?: boolean
          is_verified?: boolean
          name?: string
          payout_method?: string | null
          phone?: string | null
          referral_code?: string
          referral_credits?: number
          referred_by_user_id?: string | null
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          first_order_id: string | null
          id: string
          referred_user_id: string
          referrer_user_id: string
          reward_credits_awarded: number
          rewarded: boolean
        }
        Insert: {
          created_at?: string
          first_order_id?: string | null
          id?: string
          referred_user_id: string
          referrer_user_id: string
          reward_credits_awarded?: number
          rewarded?: boolean
        }
        Update: {
          created_at?: string
          first_order_id?: string | null
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_credits_awarded?: number
          rewarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "referrals_first_order_id_fkey"
            columns: ["first_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_team_members: {
        Row: {
          added_at: string
          custom_role_name: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          permissions: string[] | null
          phone: string | null
          producer_id: string
          role: string
        }
        Insert: {
          added_at?: string
          custom_role_name?: string | null
          email: string
          id?: string
          is_active?: boolean
          name: string
          permissions?: string[] | null
          phone?: string | null
          producer_id: string
          role?: string
        }
        Update: {
          added_at?: string
          custom_role_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          permissions?: string[] | null
          phone?: string | null
          producer_id?: string
          role?: string
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          file_name: string
          file_url: string | null
          id: string
          name: string
          note: string | null
          status: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_url?: string | null
          id?: string
          name: string
          note?: string | null
          status?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_url?: string | null
          id?: string
          name?: string
          note?: string | null
          status?: string
          uploaded_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "producer" | "wholesaler" | "referrer" | "admin"
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
      app_role: ["producer", "wholesaler", "referrer", "admin"],
    },
  },
} as const
