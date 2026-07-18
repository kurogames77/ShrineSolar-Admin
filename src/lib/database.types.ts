export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string
          role: 'super_admin' | 'admin' | 'manager' | 'viewer'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email: string
          role?: 'super_admin' | 'admin' | 'manager' | 'viewer'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string
          role?: 'super_admin' | 'admin' | 'manager' | 'viewer'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state_province: string | null
          postal_code: string | null
          country: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state_province?: string | null
          postal_code?: string | null
          country?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state_province?: string | null
          postal_code?: string | null
          country?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          order_number: string
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          order_category: string
          product_details: string | null
          size_or_qty: number | null
          total_amount: number
          currency: string
          order_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          order_number?: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          order_category?: string
          product_details?: string | null
          size_or_qty?: number | null
          total_amount?: number
          currency?: string
          order_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          order_number?: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          order_category?: string
          product_details?: string | null
          size_or_qty?: number | null
          total_amount?: number
          currency?: string
          order_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      installation_tracking: {
        Row: {
          id: string
          order_id: string
          installation_status: 'scheduled' | 'site_survey' | 'in_progress' | 'inspection' | 'completed' | 'on_hold'
          scheduled_date: string | null
          completion_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          installation_status?: 'scheduled' | 'site_survey' | 'in_progress' | 'inspection' | 'completed' | 'on_hold'
          scheduled_date?: string | null
          completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          installation_status?: 'scheduled' | 'site_survey' | 'in_progress' | 'inspection' | 'completed' | 'on_hold'
          scheduled_date?: string | null
          completion_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          user_id: string | null
          user_name: string | null
          action: string
          entity_type: string
          entity_name: string | null
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_name?: string | null
          action: string
          entity_type: string
          entity_name?: string | null
          details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_name?: string | null
          action?: string
          entity_type?: string
          entity_name?: string | null
          details?: string | null
          created_at?: string
        }
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
