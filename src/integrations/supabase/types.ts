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
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      b2b_invoices: {
        Row: {
          created_at: string
          currency: string
          discount_amount: number
          due_date: string | null
          id: string
          invoice_number: string
          items: Json
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_terms: string | null
          producer_id: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          wholesaler_address: Json | null
          wholesaler_email: string | null
          wholesaler_id: string
          wholesaler_name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          producer_id: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          wholesaler_address?: Json | null
          wholesaler_email?: string | null
          wholesaler_id: string
          wholesaler_name: string
        }
        Update: {
          created_at?: string
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          producer_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          wholesaler_address?: Json | null
          wholesaler_email?: string | null
          wholesaler_id?: string
          wholesaler_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          exchange_rate: number
          is_active: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          exchange_rate?: number
          is_active?: boolean
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          exchange_rate?: number
          is_active?: boolean
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applicable_items: Json | null
          applicable_to: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_items?: Json | null
          applicable_to?: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_items?: Json | null
          applicable_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      discount_usage: {
        Row: {
          created_at: string
          discount_amount: number
          discount_code_id: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_amount: number
          discount_code_id: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          discount_code_id?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_usage_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          description: string
          dispute_type: string
          id: string
          order_id: string
          raised_by: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          dispute_type: string
          id?: string
          order_id: string
          raised_by: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          dispute_type?: string
          id?: string
          order_id?: string
          raised_by?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
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
      email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          new_stock: number
          notes: string | null
          order_id: string | null
          previous_stock: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          new_stock: number
          notes?: string | null
          order_id?: string | null
          previous_stock: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          new_stock?: number
          notes?: string | null
          order_id?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          helpful_count: number
          id: string
          is_published: boolean
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          helpful_count?: number
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          helpful_count?: number
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email_orders: boolean
          email_payments: boolean
          email_promotions: boolean
          email_rfq: boolean
          email_shipments: boolean
          id: string
          in_app_orders: boolean
          in_app_payments: boolean
          in_app_promotions: boolean
          in_app_rfq: boolean
          in_app_shipments: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_orders?: boolean
          email_payments?: boolean
          email_promotions?: boolean
          email_rfq?: boolean
          email_shipments?: boolean
          id?: string
          in_app_orders?: boolean
          in_app_payments?: boolean
          in_app_promotions?: boolean
          in_app_rfq?: boolean
          in_app_shipments?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_orders?: boolean
          email_payments?: boolean
          email_promotions?: boolean
          email_rfq?: boolean
          email_shipments?: boolean
          id?: string
          in_app_orders?: boolean
          in_app_payments?: boolean
          in_app_promotions?: boolean
          in_app_rfq?: boolean
          in_app_shipments?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
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
      order_messages: {
        Row: {
          created_at: string
          flag_reason: string | null
          id: string
          is_flagged: boolean
          message: string
          order_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          message: string
          order_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          message?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string | null
          discount_amount: number | null
          discount_code_id: string | null
          id: string
          payment_reference: string | null
          payment_status: string
          shipping_address: Json
          status: string
          total_amount: number
          updated_at: string
          wholesaler_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          shipping_address?: Json
          status?: string
          total_amount?: number
          updated_at?: string
          wholesaler_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          shipping_address?: Json
          status?: string
          total_amount?: number
          updated_at?: string
          wholesaler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          order_id: string
          paid_at: string | null
          platform_fee: number
          producer_id: string
          referral_fee: number
          status: string
        }
        Insert: {
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          order_id: string
          paid_at?: string | null
          platform_fee?: number
          producer_id: string
          referral_fee?: number
          status?: string
        }
        Update: {
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          order_id?: string
          paid_at?: string | null
          platform_fee?: number
          producer_id?: string
          referral_fee?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      pos_catalog_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          name: string
          owner_id: string
          price: number
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name: string
          owner_id: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name?: string
          owner_id?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      pos_invoices: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          items: Json
          notes: string | null
          owner_id: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          items?: Json
          notes?: string | null
          owner_id: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      pos_transactions: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          owner_id: string
          payment_method: string
          payment_status: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          owner_id: string
          payment_method?: string
          payment_status?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          payment_method?: string
          payment_status?: string
          subtotal?: number
          tax?: number
          total?: number
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
      product_reviews: {
        Row: {
          created_at: string
          helpful_count: number | null
          id: string
          images: string[] | null
          is_verified_purchase: boolean | null
          order_id: string | null
          producer_response: string | null
          producer_response_at: string | null
          product_id: string
          rating: number
          review: string | null
          reviewer_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          order_id?: string | null
          producer_response?: string | null
          producer_response_at?: string | null
          product_id: string
          rating: number
          review?: string | null
          reviewer_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          order_id?: string | null
          producer_response?: string | null
          producer_response_at?: string | null
          product_id?: string
          rating?: number
          review?: string | null
          reviewer_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
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
          logo_url: string | null
          name: string
          payout_method: string | null
          phone: string | null
          preferred_currency: string | null
          privacy_accepted_at: string | null
          referral_code: string
          referral_credits: number
          referred_by_user_id: string | null
          registration_number: string | null
          tax_id: string | null
          terms_accepted_at: string | null
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
          logo_url?: string | null
          name: string
          payout_method?: string | null
          phone?: string | null
          preferred_currency?: string | null
          privacy_accepted_at?: string | null
          referral_code: string
          referral_credits?: number
          referred_by_user_id?: string | null
          registration_number?: string | null
          tax_id?: string | null
          terms_accepted_at?: string | null
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
          logo_url?: string | null
          name?: string
          payout_method?: string | null
          phone?: string | null
          preferred_currency?: string | null
          privacy_accepted_at?: string | null
          referral_code?: string
          referral_credits?: number
          referred_by_user_id?: string | null
          registration_number?: string | null
          tax_id?: string | null
          terms_accepted_at?: string | null
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
      returns: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          items: Json
          order_id: string
          producer_notes: string | null
          reason: string
          received_at: string | null
          refund_amount: number
          refunded_at: string | null
          restocking_fee: number
          return_type: string
          rma_number: string
          status: string
          updated_at: string
          wholesaler_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          items?: Json
          order_id: string
          producer_notes?: string | null
          reason: string
          received_at?: string | null
          refund_amount?: number
          refunded_at?: string | null
          restocking_fee?: number
          return_type: string
          rma_number: string
          status?: string
          updated_at?: string
          wholesaler_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          items?: Json
          order_id?: string
          producer_notes?: string | null
          reason?: string
          received_at?: string | null
          refund_amount?: number
          refunded_at?: string | null
          restocking_fee?: number
          return_type?: string
          rma_number?: string
          status?: string
          updated_at?: string
          wholesaler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_requests: {
        Row: {
          category: string | null
          created_at: string
          delivery_deadline: string | null
          delivery_location: string | null
          description: string
          expires_at: string
          id: string
          quantity: number
          status: string
          target_price: number | null
          title: string
          updated_at: string
          wholesaler_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          delivery_deadline?: string | null
          delivery_location?: string | null
          description: string
          expires_at: string
          id?: string
          quantity: number
          status?: string
          target_price?: number | null
          title: string
          updated_at?: string
          wholesaler_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          delivery_deadline?: string | null
          delivery_location?: string | null
          description?: string
          expires_at?: string
          id?: string
          quantity?: number
          status?: string
          target_price?: number | null
          title?: string
          updated_at?: string
          wholesaler_id?: string
        }
        Relationships: []
      }
      rfq_responses: {
        Row: {
          created_at: string
          id: string
          is_selected: boolean | null
          lead_time_days: number
          notes: string | null
          producer_id: string
          rfq_id: string
          status: string
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_selected?: boolean | null
          lead_time_days: number
          notes?: string | null
          producer_id: string
          rfq_id: string
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_selected?: boolean | null
          lead_time_days?: number
          notes?: string | null
          producer_id?: string
          rfq_id?: string
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_responses_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery: string | null
          carrier: string
          created_at: string
          estimated_delivery: string | null
          id: string
          notes: string | null
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          carrier?: string
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          carrier?: string
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configurations: {
        Row: {
          created_at: string
          escalation_enabled: boolean
          first_response_hours: number
          id: string
          priority: string
          resolution_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalation_enabled?: boolean
          first_response_hours?: number
          id?: string
          priority: string
          resolution_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalation_enabled?: boolean
          first_response_hours?: number
          id?: string
          priority?: string
          resolution_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean | null
          product_id: string
          resolved_at: string | null
          threshold: number | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          product_id: string
          resolved_at?: string | null
          threshold?: number | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          product_id?: string
          resolved_at?: string | null
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews: {
        Row: {
          created_at: string
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          order_id: string | null
          producer_response: string | null
          producer_response_at: string | null
          rating: number
          review: string | null
          reviewer_id: string
          store_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          producer_response?: string | null
          producer_response_at?: string | null
          rating: number
          review?: string | null
          reviewer_id: string
          store_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          producer_response?: string | null
          producer_response_at?: string | null
          rating?: number
          review?: string | null
          reviewer_id?: string
          store_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_order_id_fkey"
            columns: ["order_id"]
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
      support_canned_responses: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          escalated: boolean | null
          escalated_at: string | null
          first_response_at: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          priority: string
          rated_at: string | null
          rating: number | null
          rating_comment: string | null
          sla_breached: boolean | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          escalated?: boolean | null
          escalated_at?: string | null
          first_response_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          priority?: string
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          sla_breached?: boolean | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          escalated?: boolean | null
          escalated_at?: string | null
          first_response_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          priority?: string
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          sla_breached?: boolean | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
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
      user_suspensions: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string
          suspended_at: string
          suspended_by: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason: string
          suspended_at?: string
          suspended_by: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          suspended_at?: string
          suspended_by?: string
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
      increment_discount_usage: {
        Args: { discount_id: string }
        Returns: undefined
      }
      validate_stock_availability: { Args: { p_items: Json }; Returns: Json }
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
