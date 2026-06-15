export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      super_admins: {
        Row: {
          id: string
          user_id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          id: string
          owner_id: string
          slug: string
          name: string
          name_en: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          logo_url: string | null
          cover_image_url: string | null
          description: string | null
          description_en: string | null
          default_currency: string
          default_language: string
          timezone: string
          schedule: Json
          is_open: boolean
          is_active: boolean
          plan: 'hub_free' | 'os_gastronomy' | 'os_full'
          trial_ends_at: string | null
          subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled'
          mercadopago_enabled: boolean
          mercadopago_access_token: string | null
          created_at: string
          updated_at: string
          website: string | null
          country: string | null
          province: string | null
          address_extra: string | null
          postal_code: string | null
          directions: string | null
          social_links: Json | null
          menu_accent_color: string | null
          menu_card_style: string | null
          show_prices: boolean
          show_descriptions: boolean
          show_calories: boolean
          onboarding_completed: boolean
          features: Json | null
          onboarding_steps: Json | null
          allow_language_switch: boolean
          delivery_enabled: boolean
          delivery_time_estimate: number | null
          delivery_min_order: number | null
          delivery_fee_type: string | null
          delivery_fee_value: number | null
          delivery_zones: Json | null
          takeaway_enabled: boolean
          takeaway_time_estimate: number | null
          reservations_enabled: boolean
          reservations_collect_guests: boolean
          reservations_advance_days: number | null
          reservations_min_hours: number | null
          reservations_max_party: number | null
          reservations_time_slots: Json | null
          reservations_message: string | null
          business_type: 'gastronomy' | 'retail' | 'services' | null
        }
        Insert: {
          id?: string
          owner_id: string
          slug: string
          name: string
          name_en?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          description?: string | null
          description_en?: string | null
          default_currency?: 'ARS' | 'USD'
          default_language?: 'ES' | 'EN'
          timezone?: string
          schedule?: Json
          is_open?: boolean
          is_active?: boolean
          plan?: 'hub_free' | 'os_gastronomy' | 'os_full'
          trial_ends_at?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'cancelled'
          mercadopago_enabled?: boolean
          mercadopago_access_token?: string | null
          created_at?: string
          updated_at?: string
          website?: string | null
          country?: string | null
          province?: string | null
          address_extra?: string | null
          postal_code?: string | null
          directions?: string | null
          social_links?: Json | null
          menu_accent_color?: string | null
          menu_card_style?: string | null
          show_prices?: boolean
          show_descriptions?: boolean
          show_calories?: boolean
          onboarding_completed?: boolean
          features?: Json | null
          onboarding_steps?: Json | null
          allow_language_switch?: boolean
          delivery_enabled?: boolean
          delivery_time_estimate?: number | null
          delivery_min_order?: number | null
          delivery_fee_type?: string | null
          delivery_fee_value?: number | null
          delivery_zones?: Json | null
          takeaway_enabled?: boolean
          takeaway_time_estimate?: number | null
          reservations_enabled?: boolean
          reservations_collect_guests?: boolean
          reservations_advance_days?: number | null
          reservations_min_hours?: number | null
          reservations_max_party?: number | null
          reservations_time_slots?: Json | null
          reservations_message?: string | null
          business_type?: 'gastronomy' | 'retail' | 'services' | null
        }
        Update: {
          id?: string
          owner_id?: string
          slug?: string
          name?: string
          name_en?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          description?: string | null
          description_en?: string | null
          default_currency?: 'ARS' | 'USD'
          default_language?: 'ES' | 'EN'
          timezone?: string
          schedule?: Json
          is_open?: boolean
          is_active?: boolean
          plan?: 'hub_free' | 'os_gastronomy' | 'os_full'
          trial_ends_at?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'cancelled'
          mercadopago_enabled?: boolean
          mercadopago_access_token?: string | null
          created_at?: string
          updated_at?: string
          website?: string | null
          country?: string | null
          province?: string | null
          address_extra?: string | null
          postal_code?: string | null
          directions?: string | null
          social_links?: Json | null
          menu_accent_color?: string | null
          menu_card_style?: string | null
          show_prices?: boolean
          show_descriptions?: boolean
          show_calories?: boolean
          onboarding_completed?: boolean
          features?: Json | null
          onboarding_steps?: Json | null
          allow_language_switch?: boolean
          delivery_enabled?: boolean
          delivery_time_estimate?: number | null
          delivery_min_order?: number | null
          delivery_fee_type?: string | null
          delivery_fee_value?: number | null
          delivery_zones?: Json | null
          takeaway_enabled?: boolean
          takeaway_time_estimate?: number | null
          reservations_enabled?: boolean
          reservations_collect_guests?: boolean
          reservations_advance_days?: number | null
          reservations_min_hours?: number | null
          reservations_max_party?: number | null
          reservations_time_slots?: Json | null
          reservations_message?: string | null
          business_type?: 'gastronomy' | 'retail' | 'services' | null
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          id: string
          restaurant_id: string
          first_name: string
          last_name: string
          phone: string
          email: string | null
          total_visits: number
          total_spent: number
          avg_ticket: number
          first_visit_date: string | null
          last_visit_date: string | null
          is_vip: boolean
          tags: string[]
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          first_name?: string
          last_name?: string
          phone?: string
          email?: string | null
          total_visits?: number
          total_spent?: number
          avg_ticket?: number
          first_visit_date?: string | null
          last_visit_date?: string | null
          is_vip?: boolean
          tags?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          first_name?: string
          last_name?: string
          phone?: string
          email?: string | null
          total_visits?: number
          total_spent?: number
          avg_ticket?: number
          first_visit_date?: string | null
          last_visit_date?: string | null
          is_vip?: boolean
          tags?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_sections: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          name_en: string | null
          description: string | null
          description_en: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          name_en?: string | null
          description?: string | null
          description_en?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          name_en?: string | null
          description?: string | null
          description_en?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          section_id: string
          name: string
          name_en: string | null
          description: string | null
          description_en: string | null
          price_ars: number
          price_usd: number
          image_url: string
          video_url: string | null
          is_available: boolean
          sort_order: number
          allergens: string[]
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          section_id: string
          name: string
          name_en?: string | null
          description?: string | null
          description_en?: string | null
          price_ars: number
          price_usd: number
          image_url: string
          video_url?: string | null
          is_available?: boolean
          sort_order?: number
          allergens?: string[]
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          section_id?: string
          name?: string
          name_en?: string | null
          description?: string | null
          description_en?: string | null
          price_ars?: number
          price_usd?: number
          image_url?: string
          video_url?: string | null
          is_available?: boolean
          sort_order?: number
          allergens?: string[]
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          restaurant_id: string
          session_id: string
          order_type: 'dine_in' | 'takeaway' | 'delivery'
          table_number: string | null
          customer_name: string | null
          customer_phone: string | null
          status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled' | 'bill_requested' | 'paid'
          subtotal: number
          total: number
          currency: 'ARS' | 'USD'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          session_id: string
          order_type: 'dine_in' | 'takeaway' | 'delivery'
          table_number?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          status?: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled' | 'bill_requested' | 'paid'
          subtotal: number
          total: number
          currency?: 'ARS' | 'USD'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          session_id?: string
          order_type?: 'dine_in' | 'takeaway' | 'delivery'
          table_number?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          status?: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'delivered' | 'cancelled' | 'bill_requested' | 'paid'
          subtotal?: number
          total?: number
          currency?: 'ARS' | 'USD'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          menu_item_name: string
          menu_item_name_en: string | null
          quantity: number
          price_snapshot: number
          currency: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          menu_item_name: string
          menu_item_name_en?: string | null
          quantity: number
          price_snapshot: number
          currency?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string | null
          menu_item_name?: string
          menu_item_name_en?: string | null
          quantity?: number
          price_snapshot?: number
          currency?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      waiters: {
        Row: {
          id: string
          restaurant_id: string
          first_name: string
          last_name: string
          pin: string
          is_active: boolean
          is_on_shift: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          first_name: string
          last_name: string
          pin: string
          is_active?: boolean
          is_on_shift?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          first_name?: string
          last_name?: string
          pin?: string
          is_active?: boolean
          is_on_shift?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          id: string
          restaurant_id: string
          table_number: string
          capacity: number
          position_x: number
          position_y: number
          sort_order: number
          status: 'free' | 'occupied' | 'reserved'
          waiter_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_number: string
          capacity?: number
          position_x?: number
          position_y?: number
          sort_order?: number
          status?: 'free' | 'occupied' | 'reserved'
          waiter_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          table_number?: string
          capacity?: number
          position_x?: number
          position_y?: number
          sort_order?: number
          status?: 'free' | 'occupied' | 'reserved'
          waiter_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      waiter_calls: {
        Row: {
          id: string
          restaurant_id: string
          table_id: string
          waiter_id: string | null
          type: 'call' | 'bill_request'
          status: 'pending' | 'attended' | 'cancelled'
          created_at: string
          attended_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_id: string
          waiter_id?: string | null
          type?: 'call' | 'bill_request'
          status?: 'pending' | 'attended' | 'cancelled'
          created_at?: string
          attended_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          table_id?: string
          waiter_id?: string | null
          type?: 'call' | 'bill_request'
          status?: 'pending' | 'attended' | 'cancelled'
          created_at?: string
          attended_at?: string | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          id: string
          restaurant_id: string
          table_id: string
          waiter_id: string
          order_id: string | null
          subtotal: number
          tip: number
          total: number
          currency: string
          status: 'open' | 'paid' | 'cancelled'
          created_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_id: string
          waiter_id: string
          order_id?: string | null
          subtotal: number
          tip?: number
          total: number
          currency?: string
          status?: 'open' | 'paid' | 'cancelled'
          created_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          table_id?: string
          waiter_id?: string
          order_id?: string | null
          subtotal?: number
          tip?: number
          total?: number
          currency?: string
          status?: 'open' | 'paid' | 'cancelled'
          created_at?: string
          closed_at?: string | null
        }
        Relationships: []
      }
      bill_items: {
        Row: {
          id: string
          bill_id: string
          order_item_id: string | null
          menu_item_name: string
          quantity: number
          unit_price: number
          subtotal: number
          assigned_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          order_item_id?: string | null
          menu_item_name: string
          quantity: number
          unit_price: number
          subtotal: number
          assigned_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          order_item_id?: string | null
          menu_item_name?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
          assigned_to?: string | null
          created_at?: string
        }
        Relationships: []
      }
      access_requests: {
        Row: {
          id: string
          name: string
          email: string
          business_name: string
          phone: string | null
          city: string | null
          message: string | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          business_name: string
          phone?: string | null
          city?: string | null
          message?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          business_name?: string
          phone?: string | null
          city?: string | null
          message?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          bill_id: string
          amount: number
          payment_method: 'cash' | 'debit_card' | 'credit_card' | 'transfer' | 'mercadopago' | 'other'
          payment_details: Json | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          bill_id: string
          amount: number
          payment_method: 'cash' | 'debit_card' | 'credit_card' | 'transfer' | 'mercadopago' | 'other'
          payment_details?: Json | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          bill_id?: string
          amount?: number
          payment_method?: 'cash' | 'debit_card' | 'credit_card' | 'transfer' | 'mercadopago' | 'other'
          payment_details?: Json | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          phone: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          id: string
          restaurant_id: string
          author_id: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          author_id?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          author_id?: string | null
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      plan_changes: {
        Row: {
          id: string
          restaurant_id: string
          old_plan: string
          new_plan: string
          changed_by: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          old_plan: string
          new_plan: string
          changed_by?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          old_plan?: string
          new_plan?: string
          changed_by?: string | null
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      view_superadmin_restaurants: {
        Row: {
          id: string
          name: string
          slug: string
          city: string | null
          phone: string | null
          email: string | null
          plan: string
          subscription_status: string
          is_active: boolean
          trial_ends_at: string | null
          created_at: string
          onboarding_completed: boolean
          onboarding_steps: Json | null
          features: Json | null
          total_orders: number
          total_revenue: number
          total_products: number
          total_tables: number
          total_waiters: number
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Functions: {
      is_super_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { user_id: string; restaurant_id: string }
        Returns: boolean
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
