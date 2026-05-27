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
          default_currency: 'ARS' | 'USD'
          default_language: 'ES' | 'EN'
          timezone: string
          schedule: Json
          is_open: boolean
          is_active: boolean
          plan: 'menu' | 'pro' | 'total'
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
          plan?: 'menu' | 'pro' | 'total'
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
          plan?: 'menu' | 'pro' | 'total'
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
    }
    Views: {
      [_ in never]: never
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
